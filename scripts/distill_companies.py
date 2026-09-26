"""Distil placement interview feedback into anonymised company preparation profiles.

One-time, local-only pipeline. Reads text chunks (already extracted from candidates'
feedback PDFs) from a Chroma SQLite file, redacts personal data, asks Gemini to summarise
each company's interview process, scrubs the output again, and writes
src/data/companies.json. Source documents never enter this repository.

Usage:
    python scripts/distill_companies.py --db PATH/chroma.sqlite3 [--limit 60] [--workers 3]

Needs GEMINI_API_KEY in the environment or in .env.local. Optional REDACT_TERMS (comma-separated
institution-specific words) are stripped from the input and from every output string; they live in
.env.local so they never appear in this repository.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "src" / "data" / "companies.json"
MODEL = os.environ.get("DISTILL_MODEL", "gemini-3.8-flash")
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
MAX_CHARS_PER_COMPANY = 60_000
CONTENT_KEYS = ("roles", "rounds", "techTopics", "sampleQuestions", "hrQuestions", "tips", "resources")

STUDENT_BLOCK = re.compile(r"(?<!COMPANY )\bNAME\s*:.{0,400}?(?=COMPANY\s*NAME\s*:)", re.I | re.S)
NAME_FIELD = re.compile(
    r"(?<!COMPANY )\bNAME\s*:\s*([A-Za-z][A-Za-z .]{1,60}?)(?=\s+(?:ROLL|REG|DEPARTMENT|EMAIL|CONTACT)|$)", re.I
)
LABELLED_ID = re.compile(
    r"\b(?:ROLL\s*(?:NO|NUMBER)?|REG(?:ISTER)?\s*(?:NO|NUMBER)|EMAIL\s*(?:ID)?|CONTACT\s*(?:NO|NUMBER)"
    r"|MOBILE(?:\s*NO)?|PHONE)\s*[:\-]\s*\S+",
    re.I,
)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")
LONG_NUMBER = re.compile(r"\b\d{7,}\b")

PROFILE_SCHEMA = {
    "type": "object",
    "properties": {
        "roles": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
        "rounds": {
            "type": "array",
            "maxItems": 6,
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "format": {"type": "string"},
                    "focus": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
                },
                "required": ["name", "format", "focus"],
            },
        },
        "techTopics": {"type": "array", "items": {"type": "string"}, "maxItems": 12},
        "sampleQuestions": {"type": "array", "items": {"type": "string"}, "maxItems": 12},
        "hrQuestions": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
        "tips": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
        "resources": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
    },
    "required": list(CONTENT_KEYS),
}

PROMPT = """You are summarising placement feedback written by engineering students after interviews at {company}.
Produce a factual interview profile of {company} for juniors preparing for it.
Rules:
- Use only information present in the feedback below. Do not invent anything.
- NEVER include any person's name, roll number, email, phone number or other personal detail.
- NEVER mention any college or institution; refer to the writers only as past candidates.
- sampleQuestions: real questions students reported being asked, rewritten as clean standalone questions.
- tips: practical preparation advice the students gave.
- resources: websites, books or platforms the students recommended for preparing (for example GeeksforGeeks, IndiaBix, LeetCode).
- Keep every string under 160 characters.

<feedback>
{text}
</feedback>"""


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def student_names(text: str) -> set[str]:
    """Name tokens (3+ letters) from NAME fields, used to scrub the model output."""
    names: set[str] = set()
    for match in NAME_FIELD.finditer(text):
        names.update(t.lower() for t in re.split(r"[\s.]+", match.group(1)) if len(t) >= 3)
    return names


def term_pattern(terms: tuple[str, ...]) -> re.Pattern[str] | None:
    """Whole-word, case-insensitive matcher for institution-specific terms."""
    if not terms:
        return None
    return re.compile(r"\b(?:" + "|".join(re.escape(t) for t in terms) + r")\b", re.I)


def redact(text: str, terms: tuple[str, ...] = ()) -> str:
    institution = term_pattern(terms)
    if institution:
        text = institution.sub("", text)
    text = STUDENT_BLOCK.sub("[student details removed] ", text)
    text = LABELLED_ID.sub("[removed]", text)
    text = EMAIL.sub("[email]", text)
    text = PHONE.sub("[phone]", text)
    return LONG_NUMBER.sub("[number]", text)


def contains_pii(value: str, names: set[str], institution: re.Pattern[str] | None = None) -> bool:
    """True for personal data or anything that identifies the source institution."""
    if EMAIL.search(value) or PHONE.search(value) or LONG_NUMBER.search(value):
        return True
    if institution and institution.search(value):
        return True
    return bool({w.lower() for w in re.findall(r"[A-Za-z]+", value)} & names)


def scrub(profile: dict, names: set[str], terms: tuple[str, ...] = ()) -> dict:
    """Drop any string (or list item) that still looks like personal or institutional data."""
    institution = term_pattern(terms)
    clean: dict = {}
    for key, value in profile.items():
        if isinstance(value, str):
            clean[key] = "" if contains_pii(value, names, institution) else value
        elif isinstance(value, list):
            clean[key] = [
                scrub(item, names, terms) if isinstance(item, dict) else item
                for item in value
                if isinstance(item, dict) or (isinstance(item, str) and not contains_pii(item, names, institution))
            ]
        else:
            clean[key] = value
    return clean


def env_value(name: str) -> str:
    """Reads a setting from the environment, falling back to the git-ignored .env.local."""
    value = os.environ.get(name, "")
    env_file = ROOT / ".env.local"
    if not value and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
                value = line.split("=", 1)[1].strip().strip('"')
    return value


def load_api_key() -> str:
    key = env_value("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY is not set (environment or .env.local).")
    return key


def load_chunks(db_path: Path) -> dict[str, list[tuple[str, str]]]:
    """company -> [(source file, text)] for PDF sources, in insertion order."""
    con = sqlite3.connect(db_path)
    rows = con.execute(
        """SELECT MAX(CASE WHEN m.key = 'company' THEN m.string_value END),
                  MAX(CASE WHEN m.key = 'source' THEN m.string_value END),
                  MAX(CASE WHEN m.key = 'chroma:document' THEN m.string_value END)
           FROM embeddings e JOIN embedding_metadata m ON m.id = e.id
           GROUP BY e.id ORDER BY e.id"""
    ).fetchall()
    con.close()
    grouped: dict[str, list[tuple[str, str]]] = {}
    for company, source, text in rows:
        if company and text and (source or "").lower().endswith(".pdf"):
            grouped.setdefault(company.strip(), []).append((source, text))
    return grouped


def call_gemini(api_key: str, company: str, text: str) -> dict:
    body = {
        "contents": [{"parts": [{"text": PROMPT.format(company=company, text=text)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": PROFILE_SCHEMA,
            "thinkingConfig": {"thinkingLevel": "low"},
        },
    }
    request = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    for attempt in range(6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                payload = json.load(response)
            parts = payload["candidates"][0]["content"]["parts"]
            return json.loads("".join(p.get("text", "") for p in parts if not p.get("thought")))
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 503) and attempt < 5:
                time.sleep(min(60, 5 * 2**attempt))
                continue
            raise
    raise RuntimeError("retries exhausted")


def build_profile(api_key: str, company: str, chunks: list[tuple[str, str]], terms: tuple[str, ...]) -> dict | None:
    raw = "\n".join(text for _, text in chunks)
    summary = call_gemini(api_key, company, redact(raw, terms)[:MAX_CHARS_PER_COMPANY])
    profile = scrub(summary, student_names(raw), terms)
    if not profile.get("sampleQuestions") and not profile.get("techTopics"):
        return None
    return {
        "id": slugify(company),
        "name": company,
        "reports": len({source for source, _ in chunks}),
        **{key: profile.get(key, []) for key in CONTENT_KEYS},
    }


def write_profiles(profiles: dict[str, dict]) -> None:
    ordered = sorted(profiles.values(), key=lambda p: p["name"].lower())
    OUT_PATH.write_text(json.dumps(ordered, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--db", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=60)
    parser.add_argument("--workers", type=int, default=3)
    args = parser.parse_args()

    api_key = load_api_key()
    terms = tuple(t.strip() for t in env_value("REDACT_TERMS").split(",") if t.strip())
    grouped = load_chunks(args.db)
    existing = json.loads(OUT_PATH.read_text(encoding="utf-8")) if OUT_PATH.exists() else []
    profiles = {p["id"]: p for p in existing}
    todo = [
        (company, chunks)
        for company, chunks in sorted(grouped.items(), key=lambda kv: -len(kv[1]))[: args.limit]
        if slugify(company) not in profiles
    ]
    print(f"{len(todo)} companies to distil ({len(profiles)} already done)")
    with cf.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(build_profile, api_key, company, chunks, terms): company for company, chunks in todo}
        for future in cf.as_completed(futures):
            company = futures[future]
            try:
                profile = future.result()
            except Exception as error:  # keep going; one bad company must not stop the run
                print(f"  ! {company}: {error}")
                continue
            if profile:
                profiles[profile["id"]] = profile
                write_profiles(profiles)
                print(f"  + {company} ({profile['reports']} reports)")


if __name__ == "__main__":
    main()

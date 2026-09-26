import unittest

from distill_companies import redact, scrub, slugify, student_names

SAMPLE = (
    "PLACEMENT YEAR 2024 - 2025 NAME : B. Rishi Kumar ROLL NUMBER : 71762103032 "
    "DEPARTMENT : EEE EMAIL ID : rishi.k2004@gmail.com CONTACT NUMBER : 7708510819 "
    "COMPANY NAME : ZOHO COMPANY TYPE : Non Dream ROUND 1 : Written test on C programming"
)


class RedactTest(unittest.TestCase):
    def test_removes_student_block_but_keeps_interview_content(self):
        out = redact(SAMPLE)
        for secret in ("Rishi", "71762103032", "gmail", "7708510819"):
            self.assertNotIn(secret, out)
        self.assertIn("COMPANY NAME : ZOHO", out)
        self.assertIn("Written test on C programming", out)

    def test_redacts_loose_contact_details(self):
        out = redact("mail a.b@x.com or call +91 98765 43210, id 2004093")
        for secret in ("a.b@x.com", "98765", "2004093"):
            self.assertNotIn(secret, out)


class ScrubTest(unittest.TestCase):
    def test_drops_items_mentioning_students_or_contacts(self):
        names = student_names(SAMPLE)
        self.assertIn("rishi", names)
        profile = {
            "sampleQuestions": ["Explain pointers in C", "Rishi was asked about DBMS", "Call 9876543210"],
            "rounds": [{"name": "Round 1", "format": "Offline", "focus": ["C", "Kumar's favourite"]}],
        }
        clean = scrub(profile, names)
        self.assertEqual(clean["sampleQuestions"], ["Explain pointers in C"])
        self.assertEqual(clean["rounds"][0]["focus"], ["C"])

    def test_drops_items_naming_the_institution(self):
        profile = {"tips": ["Practise SQL joins", "Acme students start early", "The ACME drive was offline"]}
        self.assertEqual(scrub(profile, set(), ("acme",))["tips"], ["Practise SQL joins"])

    def test_removes_institution_terms_from_input(self):
        out = redact("ACME INSTITUTE OF TECHNOLOGY PLACEMENT CELL ROUND 1 : Aptitude", ("Acme Institute of Technology",))
        self.assertNotIn("ACME", out)
        self.assertIn("ROUND 1 : Aptitude", out)

    def test_institution_terms_match_whole_words_only(self):
        self.assertEqual(scrub({"tips": ["Check server capacity"]}, set(), ("pac",))["tips"], ["Check server capacity"])

    def test_slugify(self):
        self.assertEqual(slugify("L&T Technology Services(LTTS)"), "l-t-technology-services-ltts")


if __name__ == "__main__":
    unittest.main()

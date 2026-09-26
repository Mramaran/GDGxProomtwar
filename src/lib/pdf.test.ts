import { describe, expect, it } from 'vitest';
import { MAX_RESUME_BYTES, readPdfAsBase64, validateResumeFile } from './pdf';

const file = (content: string, name: string, type: string) => new File([content], name, { type });

describe('validateResumeFile', () => {
  it('accepts a PDF', () => {
    expect(validateResumeFile(file('%PDF-1.4', 'cv.pdf', 'application/pdf'))).toBeNull();
  });

  it('rejects other file types, empty files and big files', () => {
    expect(validateResumeFile(file('x', 'cv.docx', 'application/msword'))).toMatch(/pdf/i);
    expect(validateResumeFile(file('', 'cv.pdf', 'application/pdf'))).toMatch(/empty/i);
    const big = new File([new Uint8Array(MAX_RESUME_BYTES + 1)], 'big.pdf', { type: 'application/pdf' });
    expect(validateResumeFile(big)).toMatch(/10 MB/);
  });
});

describe('readPdfAsBase64', () => {
  it('encodes a real PDF', async () => {
    await expect(readPdfAsBase64(file('%PDF-1', 'cv.pdf', 'application/pdf'))).resolves.toBe(btoa('%PDF-1'));
  });

  it('rejects files that only pretend to be PDFs', async () => {
    await expect(readPdfAsBase64(file('hello', 'cv.pdf', 'application/pdf'))).rejects.toThrow(/not a valid pdf/i);
  });
});

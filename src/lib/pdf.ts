import { UserFacingError } from './errors';

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

/** Returns a message for the student, or null when the file is an acceptable resume PDF. */
export function validateResumeFile(file: File | null): string | null {
  if (!file) return 'Choose your resume PDF first.';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Please upload a PDF file.';
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_RESUME_BYTES) return 'Please upload a PDF under 10 MB.';
  return null;
}

/** Reads the file, checks the PDF signature, and returns base64 for the model. */
export async function readPdfAsBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
    throw new UserFacingError('That file is not a valid PDF.');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

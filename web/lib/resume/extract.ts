// Server-side text extraction for uploaded resume files. Files are parsed
// in-request and discarded — nothing is written to storage. Both parsers are
// dynamic-imported so they stay out of unrelated serverless bundles.

export const RESUME_UPLOAD_MAX_BYTES = 4.5 * 1024 * 1024; // Netlify lambda payload headroom
export const RESUME_EXTRACT_MIN_CHARS = 200;

export class ResumeFileError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ResumeFileError';
  }
}

type ResumeFileKind = 'pdf' | 'docx';

function sniffKind(buffer: Buffer): ResumeFileKind | null {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // DOCX is a zip container: PK\x03\x04.
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'docx';
  return null;
}

/**
 * Extracts plain text from an uploaded PDF or DOCX resume.
 *
 * @throws `ResumeFileError` with an HTTP status when the file is too large,
 * an unsupported format, or yields too little text (e.g. a scanned PDF).
 */
export async function extractResumeText(buffer: Buffer): Promise<string> {
  if (buffer.length === 0) throw new ResumeFileError('The uploaded file is empty', 400);
  if (buffer.length > RESUME_UPLOAD_MAX_BYTES) {
    throw new ResumeFileError('File is too large — the limit is 4.5 MB', 413);
  }
  const kind = sniffKind(buffer);
  if (!kind) {
    throw new ResumeFileError('Unsupported file type — upload a PDF or Word (.docx) file', 415);
  }

  let text: string;
  try {
    if (kind === 'pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }
  } catch (error) {
    console.error('resume text extraction failed:', error instanceof Error ? error.message : error);
    throw new ResumeFileError('Could not read that file — try pasting the text instead', 422);
  }

  const cleaned = text.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (cleaned.length < RESUME_EXTRACT_MIN_CHARS) {
    throw new ResumeFileError(
      'Very little text could be read from that file (scanned PDFs are not supported) — paste the text instead',
      422,
    );
  }
  return cleaned;
}

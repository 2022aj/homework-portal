import JSZip from "jszip";
import * as XLSX from "xlsx";

/**
 * Extracted, plain-text representation of an uploaded assignment file,
 * ready to hand to Claude for follow-up question generation.
 */
export type ExtractedFileText = {
  text: string;
  truncated: boolean;
};

/**
 * Thrown when a file type cannot be turned into text (e.g. legacy binary
 * .ppt) so callers can fall back to the question bank instead of hard
 * failing the student's submission.
 */
export class UnsupportedFileTypeError extends Error {}

// Keep the extracted text bounded so a huge workbook or deck doesn't blow
// up token usage/cost when sent to Claude. ~15k characters is generous for
// a class project file while staying cheap on a per-submission basis.
const MAX_EXTRACTED_CHARS = 15000;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFromWorkbookBuffer(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      continue;
    }

    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false }).trim();

    if (csv) {
      sections.push(`Sheet: ${sheetName}\n${csv}`);
    }
  }

  return sections.join("\n\n");
}

async function extractTextFromPptxBuffer(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFileNames = Object.keys(zip.files)
    .filter((fileName) => /^ppt\/slides\/slide\d+\.xml$/.test(fileName))
    .sort((a, b) => {
      const indexA = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const indexB = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return indexA - indexB;
    });

  const slideSections: string[] = [];

  for (const [position, fileName] of slideFileNames.entries()) {
    const file = zip.files[fileName];
    if (!file) {
      continue;
    }

    const xml = await file.async("text");
    const textMatches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((match) =>
      decodeXmlEntities(match[1] ?? ""),
    );
    const slideText = textMatches.join(" ").replace(/\s+/g, " ").trim();

    if (slideText) {
      slideSections.push(`Slide ${position + 1}: ${slideText}`);
    }
  }

  return slideSections.join("\n\n");
}

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Extracts visible text from an uploaded assignment file so it can be sent
 * to Claude. Supports .xlsx/.xls (via cell values) and .pptx (via slide
 * text). Legacy binary .ppt and any other extension throw
 * UnsupportedFileTypeError so callers can fall back gracefully.
 */
export async function extractTextFromUploadedFile(
  buffer: Buffer,
  fileName: string,
): Promise<ExtractedFileText> {
  const extension = getExtension(fileName);

  let rawText: string;

  if (extension === "xlsx" || extension === "xls") {
    rawText = extractTextFromWorkbookBuffer(buffer);
  } else if (extension === "pptx") {
    rawText = await extractTextFromPptxBuffer(buffer);
  } else if (extension === "ppt") {
    throw new UnsupportedFileTypeError(
      "Legacy .ppt files cannot be read automatically. Ask the student to re-save as .pptx.",
    );
  } else {
    throw new UnsupportedFileTypeError(
      `Files of type .${extension || "unknown"} are not supported for text extraction.`,
    );
  }

  const trimmedText = rawText.trim();

  if (!trimmedText) {
    throw new UnsupportedFileTypeError(
      "No readable text could be found in the uploaded file.",
    );
  }

  const truncated = trimmedText.length > MAX_EXTRACTED_CHARS;

  return {
    text: truncated ? trimmedText.slice(0, MAX_EXTRACTED_CHARS) : trimmedText,
    truncated,
  };
}

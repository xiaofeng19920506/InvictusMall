import { createWorker } from "tesseract.js";
import { logger } from "../utils/logger";

export interface OCRResult {
  text: string;
  confidence: number;
  lines?: string[];
  words?: string[];
}

/**
 * Extract text from an image using OCR
 * Supports multiple languages including English and Chinese
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  options?: {
    language?: string; // e.g., 'eng', 'chi_sim', 'eng+chi_sim'
    whitelist?: string; // Characters to recognize
  }
): Promise<OCRResult> {
  const worker = await createWorker(options?.language || "eng+chi_sim");

  try {
    // Set whitelist if provided (useful for barcodes, product codes)
    if (options?.whitelist) {
      await worker.setParameters({
        tessedit_char_whitelist: options.whitelist,
      });
    }

    // Perform OCR
    const result = await worker.recognize(imageBuffer);
    const { text, confidence } = result.data;

    // Extract lines and words from the result
    // tesseract.js returns blocks, paragraphs, lines, and words in a hierarchical structure
    const lines: string[] = [];
    const words: string[] = [];

    if (result.data.blocks) {
      for (const block of result.data.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                const lineText = line.text?.trim();
                if (lineText && lineText.length > 0) {
                  lines.push(lineText);
                }
                if (line.words) {
                  for (const word of line.words) {
                    const wordText = word.text?.trim();
                    if (wordText && wordText.length > 0) {
                      words.push(wordText);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Clean up
    await worker.terminate();

    logger.info("OCR completed", {
      textLength: text.length,
      confidence,
      linesCount: lines.length,
      wordsCount: words.length,
    });

    return {
      text: text.trim(),
      confidence,
      lines: lines.length > 0 ? lines : undefined,
      words: words.length > 0 ? words : undefined,
    };
  } catch (error) {
    // Clean up on error
    await worker.terminate();
    logger.error("OCR processing failed", error);
    throw error;
  }
}

/**
 * Extract product information from OCR text
 * Attempts to identify product name, barcode, price, etc.
 */
export function parseProductInfoFromText(text: string): {
  name?: string;
  barcode?: string;
  price?: number;
  otherInfo?: string[];
} {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const result: {
    name?: string;
    barcode?: string;
    price?: number;
    otherInfo?: string[];
  } = {
    otherInfo: [],
  };

  for (const line of lines) {
    // Try to extract barcode (usually 8-13 digits)
    const barcodeMatch = line.match(/\b\d{8,13}\b/);
    if (barcodeMatch && !result.barcode) {
      result.barcode = barcodeMatch[0];
    }

    // Try to extract price (format: $XX.XX, ¥XX.XX, XX.XX, etc.)
    const priceMatch = line.match(/(?:[\$¥€£]|CNY|USD|EUR)?\s*(\d+\.?\d*)/);
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1]);
      if (!isNaN(price) && price > 0 && (!result.price || price > result.price)) {
        result.price = price;
      }
    }

    // First meaningful line might be product name
    if (!result.name && line.length > 2 && !barcodeMatch && !priceMatch) {
      // Skip lines that are mostly numbers or symbols
      if (line.match(/[a-zA-Z\u4e00-\u9fa5]/)) {
        result.name = line;
      }
    }

    // Collect other information
    if (line !== result.name && line !== result.barcode && !priceMatch) {
      result.otherInfo?.push(line);
    }
  }

  return result;
}


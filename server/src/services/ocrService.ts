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
 * When scanning barcode/product label, extract:
 * - Product name: First meaningful text line (the main product name)
 * - Serial Number (S/N): Extract from "S/N:" or "SN:" prefix
 * - Barcode: If scanned separately
 */
export function parseProductInfoFromText(text: string): {
  name?: string;
  serialNumber?: string;
  barcode?: string;
  price?: number;
  otherInfo?: string[];
} {
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  const result: {
    name?: string;
    serialNumber?: string;
    barcode?: string;
    price?: number;
    otherInfo?: string[];
  } = {
    otherInfo: [],
  };

  // Find the first meaningful line as product name
  // Usually the first line with substantial text (more than 3 characters and contains letters)
  let foundFirstMeaningfulLine = false;
  for (const line of lines) {
    // Skip empty lines
    if (line.length < 3) continue;
    
    // Skip lines that are mostly symbols or numbers without letters
    const hasLetters = /[a-zA-Z\u4e00-\u9fa5]/.test(line);
    if (!hasLetters) continue;
    
    // Skip lines that look like serial numbers or codes
    if (/^(S\/N|SN|S\/N:|SN:)/i.test(line)) continue;
    
    // Skip short codes (all caps/numbers with dashes, less than 20 chars)
    if (/^[A-Z0-9\-]+$/.test(line) && line.length < 20) continue;
    
    // Skip lines that are just labels or separators
    if (/^(LR|MNK|Part|Model|Code|SKU|MNK:)/i.test(line)) continue;
    
    // Skip lines that contain S/N pattern in the middle
    if (/S\/N:/i.test(line) && !foundFirstMeaningfulLine) continue;
    
    // This looks like a product name - take the first meaningful line we find
    if (!result.name) {
      result.name = line;
      foundFirstMeaningfulLine = true;
    }
  }
  
  // If we still don't have a name, use the first non-empty line with letters
  if (!result.name) {
    for (const line of lines) {
      if (line.length >= 3 && /[a-zA-Z\u4e00-\u9fa5]/.test(line)) {
        result.name = line;
        break;
      }
    }
  }
  
  // Fallback: use the full text (cleaned up) if no name found
  if (!result.name) {
    const cleanedText = text.trim().split('\n').find(line => line.trim().length > 0);
    if (cleanedText) {
      result.name = cleanedText.trim();
    }
  }

  // Extract Serial Number (S/N)
  for (const line of lines) {
    // Match patterns like "S/N: 602-V510-100SB2309001595" or "SN: 12345"
    const serialMatch = line.match(/(?:S\/N|SN)[:\s]+([A-Z0-9\-]+)/i);
    if (serialMatch && serialMatch[1]) {
      result.serialNumber = serialMatch[1].trim();
      break;
    }
  }

  // Extract barcode (if present as standalone)
  for (const line of lines) {
    // Look for barcode pattern (8-13 digits, possibly with dashes)
    const barcodeMatch = line.match(/\b(\d{8,13})\b/);
    if (barcodeMatch && barcodeMatch[1] && !result.barcode) {
      // Don't confuse serial number with barcode
      if (!result.serialNumber || !result.serialNumber.includes(barcodeMatch[1])) {
        result.barcode = barcodeMatch[1];
      }
    }
  }

  // Extract price if present
  for (const line of lines) {
    const priceMatch = line.match(/(?:[\$¥€£]|CNY|USD|EUR)?\s*(\d+\.?\d*)/);
    if (priceMatch && priceMatch[1]) {
      const price = parseFloat(priceMatch[1]);
      if (!isNaN(price) && price > 0 && (!result.price || price > result.price)) {
        result.price = price;
      }
    }
  }

  return result;
}


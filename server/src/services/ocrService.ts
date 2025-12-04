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

  // Find the best product name line
  // Strategy: Look for lines that:
  // 1. Are longer and more substantial (likely product names)
  // 2. Contain product keywords (GeForce, RTX, GAMING, etc.)
  // 3. Look more like actual product names vs OCR errors
  
  // Filter out invalid lines first - more aggressive filtering of OCR errors
  const validLines = lines.filter((line) => {
    // Skip empty lines
    if (line.length < 3) return false;
    
    // Skip lines that are mostly symbols or numbers without letters
    const hasLetters = /[a-zA-Z\u4e00-\u9fa5]/.test(line);
    if (!hasLetters) return false;
    
    // Skip lines that look like serial numbers or codes
    if (/^(S\/N|SN|S\/N:|SN:)/i.test(line)) return false;
    
    // Skip lines that are just labels or separators
    if (/^(LR|MNK|Part|Model|Code|SKU|MNK:|EAN|UPC|Part Number)/i.test(line)) return false;
    
    // Skip lines that contain S/N pattern
    if (/S\/N:/i.test(line)) return false;
    
    // Count meaningful words (at least 3 characters)
    const words = line.split(/\s+/).filter(w => w.length >= 3);
    const wordCount = words.length;
    
    // Aggressively filter out short OCR errors
    // Lines with very short words (< 5 chars each) and few words are likely OCR errors
    if (line.length < 20) {
      const allShortWords = words.every(w => w.length <= 4);
      if (allShortWords && wordCount <= 3) {
        // Only keep if it has strong product keywords
        const hasStrongKeywords = /(GeForce|RTX|GTX|GAMING|Radeon|Ryzen|Intel|AMD)/i.test(line);
        if (!hasStrongKeywords) return false;
      }
    }
    
    // Filter out all-caps short random words (common OCR errors like "SHEERS TEL REE")
    // Pattern: All caps, short length, 3-4 short words, no product keywords
    if (/^[A-Z\s]{3,20}$/.test(line)) {
      const shortWordCount = words.filter(w => w.length <= 5).length;
      const hasProductKeywords = /(GeForce|RTX|GTX|GAMING|PRO|SUPER|Slim|Ti|4090|4080|3090|Radeon|Ryzen)/i.test(line);
      
      // If it's all short words with no keywords, it's likely an OCR error
      if (shortWordCount === wordCount && wordCount >= 3 && !hasProductKeywords) {
        return false;
      }
    }
    
    return true;
  });
  
  // Score each valid line to find the best product name
  const scoredLines = validLines.map((line) => {
    let score = 0;
    
    // Longer lines are more likely to be product names (product names are usually detailed)
    if (line.length >= 40) score += 15;
    else if (line.length >= 30) score += 10;
    else if (line.length >= 20) score += 5;
    else if (line.length >= 15) score += 2;
    
    // Product keywords boost score significantly (these are strong indicators)
    const strongKeywords = [
      { pattern: /GeForce/i, weight: 25 }, // Very strong indicator
      { pattern: /RTX|GTX/i, weight: 20 },
      { pattern: /GAMING/i, weight: 15 },
      { pattern: /Radeon/i, weight: 20 },
      { pattern: /Ryzen/i, weight: 20 },
      { pattern: /Intel|Core/i, weight: 15 },
      { pattern: /AMD/i, weight: 10 },
    ];
    
    strongKeywords.forEach(({ pattern, weight }) => {
      if (pattern.test(line)) {
        score += weight;
      }
    });
    
    // Model numbers boost score (e.g., 4090, 4080, 3090, RTX 4090)
    if (/\b(4|3|2)[0-9]{3,4}\b/.test(line)) {
      score += 12; // Model numbers are strong indicators
    }
    
    // Memory specifications (e.g., 24G, 16GB, 32GB) - often part of product names
    if (/\b\d{1,3}[GM]B?\b/i.test(line)) {
      score += 8;
    }
    
    // Product suffixes boost score (SLIM, Ti, X, Lite, PRO, SUPER)
    if (/\b(SLIM|Ti|X|Lite|PRO|SUPER|GAMING)\b/i.test(line)) {
      score += 8;
    }
    
    // Mixed case suggests real product names (not OCR errors)
    if (/[a-z]/.test(line) && /[A-Z]/.test(line)) {
      score += 5;
    }
    
    // Heavy penalty for lines that look like OCR errors
    // Pattern: All caps, short length, short words, no keywords
    if (/^[A-Z\s]{3,20}$/.test(line)) {
      const words = line.split(/\s+/).filter(w => w.length > 2);
      const allShortWords = words.every(w => w.length <= 5);
      const hasStrongKeywords = /(GeForce|RTX|GTX|GAMING|4090|4080)/i.test(line);
      
      if (allShortWords && words.length >= 3 && !hasStrongKeywords) {
        score -= 30; // Heavy penalty - likely OCR error like "SHEERS TEL REE"
      }
    }
    
    // Additional penalty for very short lines without strong indicators
    if (line.length < 18 && score < 20) {
      score -= 10;
    }
    
    return { line, score };
  });
  
  // Sort by score and pick the best one
  scoredLines.sort((a, b) => b.score - a.score);
  
  // Log scoring results for debugging
  logger.info("OCR product name parsing", {
    totalLines: lines.length,
    validLines: validLines.length,
    topCandidates: scoredLines.slice(0, 5).map(s => ({ 
      line: s.line, 
      score: s.score,
      length: s.line.length 
    })),
  });
  
  const topScoredLine = scoredLines[0];
  if (topScoredLine && topScoredLine.score > 0) {
    result.name = topScoredLine.line.trim();
    logger.info("Product name selected", { 
      name: result.name, 
      score: topScoredLine.score,
      alternatives: scoredLines.slice(1, 3).map(s => s.line)
    });
  } else {
    // Fallback: use the longest valid line
    const longestLine = validLines.reduce((longest, current) => 
      current.length > longest.length ? current : longest, 
      validLines[0] || ""
    );
    if (longestLine && longestLine.length >= 10) {
      result.name = longestLine.trim();
      logger.info("Product name selected (longest line fallback)", { name: result.name });
    }
  }
  
  // Final fallback: use the first non-empty line with letters
  if (!result.name) {
    for (const line of lines) {
      if (line.length >= 10 && /[a-zA-Z\u4e00-\u9fa5]/.test(line)) {
        result.name = line.trim();
        logger.info("Product name selected (final fallback)", { name: result.name });
        break;
      }
    }
  }

  // Extract Serial Number (S/N) - improved pattern matching
  for (const line of lines) {
    // Try multiple patterns for S/N extraction
    // Pattern 1: "S/N: 602-V510-100SB2309001595" or "SN: 12345"
    let serialMatch = line.match(/(?:S\/N|SN)[:\s]+([A-Z0-9\-]+)/i);
    
    // Pattern 2: "S/N602-V510-100SB2309001595" (no space or colon)
    if (!serialMatch) {
      serialMatch = line.match(/(?:S\/N|SN)([A-Z0-9\-]+)/i);
    }
    
    // Pattern 3: Look for pattern like "602-V510-100SB2309001595" after S/N markers
    if (!serialMatch) {
      // Extract text after "S/N" or "SN"
      const snMarker = line.match(/(?:S\/N|SN)[:\s]*/i);
      if (snMarker) {
        const afterMarker = line.substring(snMarker.index! + snMarker[0].length);
        // Match alphanumeric-dash pattern (common S/N format)
        const snPattern = afterMarker.match(/([A-Z0-9\-]{10,})/i);
        if (snPattern && snPattern[1]) {
          // Create a match array compatible with RegExpMatchArray format
          serialMatch = snPattern;
        }
      }
    }
    
    if (serialMatch && serialMatch[1]) {
      result.serialNumber = serialMatch[1].trim();
      logger.debug("S/N extracted", { line, serialNumber: result.serialNumber });
      break;
    }
  }
  
  // If S/N not found in explicit patterns, try to find it in lines containing "S/N"
  if (!result.serialNumber) {
    for (const line of lines) {
      if (/S\/N/i.test(line)) {
        // Extract alphanumeric-dash pattern from the line (more lenient)
        // Look for patterns like "602-V510-100SB2309001595"
        const snPattern = line.match(/([A-Z0-9\-]{10,})/i);
        if (snPattern && snPattern[1] && snPattern[1].length >= 10) {
          result.serialNumber = snPattern[1].trim();
          logger.info("S/N extracted (fallback pattern)", { line, serialNumber: result.serialNumber });
          break;
        }
      }
    }
  }
  
  // Log final result
  logger.info("OCR parsing complete", {
    productName: result.name,
    serialNumber: result.serialNumber,
    hasName: !!result.name,
    hasSerialNumber: !!result.serialNumber,
  });

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


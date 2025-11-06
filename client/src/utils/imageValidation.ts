/**
 * Utility functions for validating image files
 */

/**
 * Check if a file is a valid image by examining its binary signature (magic numbers)
 * This is more secure than just checking the file extension or MIME type
 */
export function isValidImageFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onloadend = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }
      
      const bytes = new Uint8Array(arrayBuffer);
      const isValid = checkImageSignature(bytes);
      resolve(isValid);
    };
    
    reader.onerror = () => {
      resolve(false);
    };
    
    // Read only the first few bytes (magic number)
    const blob = file.slice(0, 12);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check image signature (magic numbers) to determine if the file is actually an image
 * Supports: JPEG, PNG, GIF, WebP, BMP, SVG
 */
function checkImageSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 4) {
    return false;
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return true;
  }

  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return true;
  }

  // WebP: Check for RIFF...WEBP
  if (bytes.length >= 12) {
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
    ) {
      return true;
    }
  }

  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return true;
  }

  // SVG: Check if it starts with XML-like content (<?xml or <svg)
  // Note: SVG is text-based, so we check the beginning
  if (bytes.length >= 5) {
    const text = String.fromCharCode(...bytes.slice(0, Math.min(100, bytes.length)));
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<svg')) {
      return true;
    }
  }

  return false;
}

/**
 * Validate image file with both MIME type and binary signature check
 */
export async function validateImageFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Check file extension/MIME type first (quick check)
  const validMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];

  if (!file.type || !validMimeTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, BMP, or SVG image.'
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image size must be less than 5MB'
    };
  }

  // Perform binary signature validation (more secure)
  const isValidBinary = await isValidImageFile(file);
  if (!isValidBinary) {
    return {
      valid: false,
      error: 'Invalid image file. The file does not appear to be a valid image format.'
    };
  }

  return { valid: true };
}


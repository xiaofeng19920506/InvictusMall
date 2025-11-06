/**
 * Utility functions for validating image files on the server
 */

/**
 * Check if a buffer contains a valid image by examining its binary signature (magic numbers)
 * This is more secure than just checking the MIME type
 */
export function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const bytes = new Uint8Array(buffer);

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
  if (buffer.length >= 12) {
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
  if (buffer.length >= 5) {
    const text = buffer.toString('utf8', 0, Math.min(100, buffer.length));
    if (text.trim().startsWith('<?xml') || text.trim().startsWith('<svg')) {
      return true;
    }
  }

  return false;
}

/**
 * Validate image file with both MIME type and binary signature check
 */
export function validateImageFile(
  buffer: Buffer,
  mimetype: string,
  size: number
): { valid: boolean; error?: string } {
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (size > maxSize) {
    return {
      valid: false,
      error: 'Image size must be less than 5MB'
    };
  }

  // Check MIME type
  const validMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml'
  ];

  if (!mimetype || !validMimeTypes.includes(mimetype.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, GIF, WebP, BMP, or SVG images are allowed.'
    };
  }

  // Perform binary signature validation (more secure)
  const isValidBinary = isValidImageBuffer(buffer);
  if (!isValidBinary) {
    return {
      valid: false,
      error: 'Invalid image file. The file does not appear to be a valid image format. The file may be corrupted or not an actual image file.'
    };
  }

  return { valid: true };
}


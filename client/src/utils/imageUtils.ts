/**
 * Utility functions for handling image URLs
 */

/**
 * Get the full URL for an avatar image
 * If the avatar URL is already a full URL, return it as is
 * Otherwise, prepend the API base URL
 */
export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  
  // If it's already a full URL (http:// or https://), return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If it starts with /uploads, prepend the API base URL
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${baseUrl}${avatarUrl}`;
  }
  
  // Return as is if it doesn't match expected patterns
  return avatarUrl;
}

/**
 * Get the full URL for a store or product image
 * Similar to getAvatarUrl but for store/product images
 */
export function getImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If it starts with /uploads, prepend the API base URL
  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return `${baseUrl}${imageUrl}`;
  }
  
  // Return as is if it doesn't match expected patterns
  return imageUrl;
}



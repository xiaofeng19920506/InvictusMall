/**
 * Utility functions for handling image URLs in the admin app
 */

/**
 * Get the full URL for a store or product image
 * If the image URL is already a full URL, return it as is
 * Otherwise, prepend the appropriate base URL
 */
export function getImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;

  // If it's already a full URL (http:// or https://), return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If it starts with /images/, use the storage service URL
  if (imageUrl.startsWith('/images/')) {
    const storageUrl = import.meta.env.VITE_STORAGE_URL || '';
    return `${storageUrl}${imageUrl}`;
  }

  // If it starts with /uploads/, prepend the API base URL
  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${imageUrl}`;
  }

  // Return as is if it doesn't match expected patterns
  return imageUrl;
}

/**
 * Get the full URL for an avatar image
 * Similar to getImageUrl but for user avatars
 */
export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  // For admin app, avatars follow the same pattern as images
  return getImageUrl(avatarUrl);
}

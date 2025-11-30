/**
 * Utility functions for handling image URLs
 */

// 1x1 transparent PNG as data URI - prevents network requests
const PLACEHOLDER_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

/**
 * Get the full URL for an avatar image
 * If the avatar URL is already a full URL, return it as is
 * Otherwise, prepend the appropriate base URL
 */
export function getAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl) return undefined;
  
  // If it's already a full URL (http:// or https://), return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If it starts with /images/, use the storage service URL (port 9000)
  if (avatarUrl.startsWith('/images/')) {
    const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL || "";
    return `${storageUrl}${avatarUrl}`;
  }
  
  // If it starts with /uploads/, prepend the API base URL
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
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
  
  // If it starts with /images/, use the storage service URL (port 9000)
  if (imageUrl.startsWith('/images/')) {
    const storageUrl = process.env.NEXT_PUBLIC_STORAGE_URL || '';
    return `${storageUrl}${imageUrl}`;
  }
  
  // If it starts with /uploads/, prepend the API base URL
  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}${imageUrl}`;
  }
  
  // Return as is if it doesn't match expected patterns
  return imageUrl;
}

/**
 * Get a placeholder image URL that won't cause network requests
 * Returns a data URI that can be used as a fallback
 */
export function getPlaceholderImage(): string {
  return PLACEHOLDER_DATA_URI;
}

/**
 * Handle image error and prevent infinite loading loops
 * Sets the image to a data URI placeholder that won't trigger network requests
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>): void {
  const target = e.target as HTMLImageElement;
  // Prevent infinite loop by removing error handler
  target.onerror = null;
  // Use data URI instead of a file path to prevent network requests
  target.src = PLACEHOLDER_DATA_URI;
}

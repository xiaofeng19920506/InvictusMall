/**
 * Utility functions for handling image URLs in the admin app
 */

// API base URL - for upload API (localhost:3001)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// Storage URL - where images are actually stored
// Must be set via VITE_STORAGE_URL environment variable for security
const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:9000';

<<<<<<< HEAD
=======
// 1x1 transparent PNG as data URI - prevents network requests
const PLACEHOLDER_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
// Warn if storage URL is using default (should be set via env var)
if (import.meta.env.DEV && !import.meta.env.VITE_STORAGE_URL) {
  console.warn('⚠️ VITE_STORAGE_URL is not set. Using default localhost:9000. Please set it in .env file for production.');
}

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

  // If it starts with /images/, use the storage service URL directly
  // Images are stored in STORAGE_URL domain, not through API proxy
  if (imageUrl.startsWith('/images/')) {
    return `${STORAGE_URL}${imageUrl}`;
  }

  // If it starts with /uploads/, prepend the API base URL
  if (imageUrl.startsWith('/uploads/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  // If it's a relative path starting with /, prepend storage URL
  if (imageUrl.startsWith('/')) {
    return `${STORAGE_URL}${imageUrl}`;
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

/**
<<<<<<< HEAD
=======
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

/**
>>>>>>> bcc2c5c8c5e42fe7bc4d70fbb3c123ad7a9c4009
 * Get the current storage URL being used
 * Useful for debugging
 */
export function getStorageUrl(): string {
  return STORAGE_URL;
}

/**
 * Get the current API base URL being used
 * Useful for debugging
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

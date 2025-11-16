import { Request, Response } from 'express';

/**
 * Generate ETag from last modified timestamp and optional cache key
 */
export function generateETag(lastModified: string, cacheKey: string = ''): string {
  const etagValue = `${lastModified}-${cacheKey}`;
  return `"${Buffer.from(etagValue).toString('base64')}"`;
}

/**
 * Check if client's ETag matches server's ETag (cache validation)
 */
export function checkETag(req: Request, etag: string): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  return ifNoneMatch === etag;
}

/**
 * Set cache headers on response
 */
export function setCacheHeaders(res: Response, etag: string): void {
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
}

/**
 * Handle ETag validation - returns true if cache is valid (304 should be sent)
 */
export function handleETagValidation(
  req: Request,
  res: Response,
  lastModified: string,
  cacheKey: string = ''
): boolean {
  const etag = generateETag(lastModified, cacheKey);
  
  if (checkETag(req, etag)) {
    // Cache is valid, return 304 Not Modified
    res.status(304).end();
    return true;
  }
  
  // Cache is invalid or doesn't exist, set headers and continue
  setCacheHeaders(res, etag);
  return false;
}


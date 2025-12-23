/**
 * File helpers for Cloudflare R2 (S3-compatible).
 * We mostly use presigned upload URLs; backend stores metadata + final URL.
 */

const SAFE_FILENAME_MAX = 120;

export function sanitizeFilename(input: string): string {
  const trimmed = (input || 'file').trim();
  const cleaned = trimmed
    .replace(/[/\\?%*:|"<>]/g, '-') // windows/URL unsafe chars
    .replace(/\s+/g, ' ')
    .replace(/\.+/g, '.');

  const short = cleaned.slice(0, SAFE_FILENAME_MAX);
  return short.length ? short : 'file';
}

export function inferContentTypeFromExt(filename: string): string {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Construct an object key for R2.
 * Example:
 *  schools/ASE001/teachers/<teacherId>/profile/<timestamp>-photo.png
 */
export function buildR2ObjectKey(parts: string[]): string {
  const filtered = parts
    .filter((p) => !!p)
    .map((p) => String(p).trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/^\/+|\/+$/g, '')); // remove leading/trailing slashes

  return filtered.join('/');
}

/**
 * Public URL from configured base (CDN/domain). If base not set, return key.
 */
export function toPublicFileUrl(publicBaseUrl: string | undefined, objectKey: string): string {
  if (!publicBaseUrl) return objectKey;
  const base = publicBaseUrl.replace(/\/+$/g, '');
  const key = objectKey.replace(/^\/+/g, '');
  return `${base}/${key}`;
}

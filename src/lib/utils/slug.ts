const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSlug(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join('');
}

export function isValidCustomSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,30}$/.test(slug);
}

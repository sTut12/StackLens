/**
 * Client-side input sanitization utilities
 * Defense-in-depth — backend validates too, but we sanitize on the way out.
 */

/** Max URL length we accept */
const MAX_URL_LENGTH = 2048

/** Allowed URL schemes */
const ALLOWED_SCHEMES = ['http://', 'https://']

/** Hosts that should never be analyzed (SSRF prevention on frontend too) */
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0/,
  /^::1$/,
  /^metadata\.google\.internal$/i,
]

export interface SanitizeResult {
  ok:    boolean
  url:   string
  error: string | null
}

/**
 * Sanitize and validate a URL before sending it to the backend.
 */
export function sanitizeUrl(raw: string): SanitizeResult {
  // Strip whitespace + null bytes + control chars
  let url = raw.trim().replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')

  if (!url) {
    return { ok: false, url: '', error: 'Please enter a URL.' }
  }

  // Length guard
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, url: '', error: 'URL is too long (max 2048 characters).' }
  }

  // Auto-prepend https if no scheme
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }

  // Scheme check
  const hasAllowedScheme = ALLOWED_SCHEMES.some(s => url.toLowerCase().startsWith(s))
  if (!hasAllowedScheme) {
    return { ok: false, url: '', error: 'Only http:// and https:// URLs are supported.' }
  }

  // Parse and validate structure
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, url: '', error: 'This doesn\'t look like a valid URL. Try: https://example.com' }
  }

  // Must have a hostname with a dot
  const hostname = parsed.hostname
  if (!hostname || !hostname.includes('.')) {
    return { ok: false, url: '', error: 'URL must have a valid domain name (e.g. stripe.com).' }
  }

  // Block private/internal hosts (frontend SSRF guard)
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { ok: false, url: '', error: 'This URL targets a restricted internal address.' }
    }
  }

  // Block URLs with embedded credentials (http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { ok: false, url: '', error: 'URLs with embedded credentials are not supported.' }
  }

  // Block javascript: scheme injections that somehow slipped through
  if (url.toLowerCase().includes('javascript:')) {
    return { ok: false, url: '', error: 'Invalid URL.' }
  }

  return { ok: true, url: url, error: null }
}

/**
 * Sanitize text content before displaying in the UI.
 * Strips HTML tags to prevent XSS from API response data.
 */
export function sanitizeText(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!lt;|gt;|amp;|quot;|#)/g, '&amp;')
}

/**
 * Sanitize a domain/hostname for display.
 * Only allows safe characters.
 */
export function sanitizeDomain(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw.replace(/[^a-zA-Z0-9.\-_]/g, '').slice(0, 253)
}
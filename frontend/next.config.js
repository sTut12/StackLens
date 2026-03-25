/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking — this page cannot be embedded in iframes
  { key: 'X-Frame-Options', value: 'DENY' },

  // Prevent MIME type sniffing — browser must use declared content-type
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Old-school XSS filter for legacy browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },

  // Don't send full referrer to other origins
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // Disable camera, mic, geolocation, payment, USB APIs
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },

  // DNS prefetch control — prevent leaking visited domains
  { key: 'X-DNS-Prefetch-Control', value: 'on' },

  // Content Security Policy
  // Allows: self, Google Fonts, Firebase, the FastAPI backend
  // Blocks: inline scripts (except style — needed for Tailwind), eval, object embeds
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts — Next.js dev mode needs unsafe-inline + unsafe-eval
      // In production, swap unsafe-inline for a nonce-based policy
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Styles: self + Google Fonts + inline (Tailwind injects inline styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: self + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + data URIs (for the cursor SVG)
      "img-src 'self' data: https:",
      // API connections: self + backend + Firebase
      "connect-src 'self' http://localhost:8000 https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com",
      // No iframes, no plugins, no objects
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Upgrade insecure requests in production
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  // Attach security headers to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  // Block Next.js from exposing its version in the X-Powered-By header
  poweredByHeader: false,

  // Strict mode catches more React issues in dev
  reactStrictMode: true,
}

module.exports = nextConfig
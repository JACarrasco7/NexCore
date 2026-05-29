import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const isDev = process.env.NODE_ENV === 'development'

/** Security headers — OWASP Top 10 mitigations */
const securityHeaders = [
  // Prevent MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block framing from other origins
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Disable legacy XSS filter (modern browsers use CSP instead)
  { key: 'X-XSS-Protection', value: '0' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // DNS prefetch opt-out (minor privacy/perf)
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Permissions policy — disable unused powerful features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS — only in production (dev uses HTTP)
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
  // Content Security Policy
  // nonces/hashes will be needed for inline scripts; kept broad for now,
  // tighten per-route after Sentry + analytics are confirmed.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://wger.de https://*.wger.de",
      "font-src 'self'",
      "connect-src 'self' https://cdn.jsdelivr.net",
      "media-src 'self' blob:",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ]
      .join('; ')
      .replace(/\s{2,}/g, ' '),
  },
]

const nextConfig: NextConfig = {
  // output: isDev ? undefined : 'export', // Comentado: Vercel usa serverless, no export
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: !process.env.SENTRY_DSN,
      disableLogger: true,
      telemetry: false,
      autoInstrumentServerFunctions: !!process.env.SENTRY_DSN,
    })
  : nextConfig

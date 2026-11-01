import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Showcase photos and screenshots come from the public `showcase` storage bucket.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  // The onboarding brief PDF is rendered server-side with @react-pdf/renderer, which ships
  // its own layout engine and must not be bundled by the app compiler. The showcase
  // screenshots run a real browser: @sparticuz/chromium finds its packed Chromium next to
  // its own code, so it and playwright-core stay unbundled too.
  serverExternalPackages: ['@react-pdf/renderer', '@sparticuz/chromium', 'playwright-core'],
  // The Developers pages read the reference websites' layout specs from the repo at runtime.
  // The screenshot route needs the packed Chromium, which nothing imports, so it is listed.
  outputFileTracingIncludes: {
    '/admin/developer/**': ['./docs/reference-specs/**/*'],
    '/api/developer/**': ['./docs/reference-specs/**/*'],
    '/api/showcase/screenshot': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/showcase/**' }]
      : [],
  },
};

export default withNextIntl(nextConfig);

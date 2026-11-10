import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Showcase photos and screenshots come from the public `showcase` storage bucket.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;

/**
 * A glob for files inside an installed package, at the package's real location. Under pnpm,
 * node_modules/<name> is a link into node_modules/.pnpm; listing files through the link makes
 * the deploy see one path as both a link and a folder, and Vercel fails at "Deploying outputs".
 */
function packageFiles(name: string, inner: string): string {
  try {
    const real = fs.realpathSync(path.join(process.cwd(), 'node_modules', name));
    return `./${path.relative(process.cwd(), real).split(path.sep).join('/')}/${inner}`;
  } catch {
    return `./node_modules/${name}/${inner}`;
  }
}

const nextConfig: NextConfig = {
  // The onboarding brief PDF is rendered server-side with @react-pdf/renderer, which ships
  // its own layout engine and must not be bundled by the app compiler. The showcase
  // screenshots run a real browser: @sparticuz/chromium finds its packed Chromium next to
  // its own code, so it and playwright-core stay unbundled too.
  serverExternalPackages: ['@react-pdf/renderer', '@sparticuz/chromium', 'playwright-core'],
  // The Developers pages read the reference websites' layout specs from the repo at runtime.
  // The screenshot route needs the packed Chromium, which nothing imports, and all of
  // playwright-core: it loads files such as browsers.json in ways the tracer cannot follow.
  outputFileTracingIncludes: {
    // The Design tab also reads a client's own reference website in the same browser.
    '/admin/developer/**': ['./docs/reference-specs/**/*', packageFiles('@sparticuz/chromium', 'bin/**'), packageFiles('playwright-core', '**')],
    // The automatic design prompts after the client confirms (/api/developer/auto): the library
    // specs, and the same browser for a client's own reference website.
    '/api/developer/**': ['./docs/reference-specs/**/*', packageFiles('@sparticuz/chromium', 'bin/**'), packageFiles('playwright-core', '**')],
    '/api/showcase/screenshot': [packageFiles('@sparticuz/chromium', 'bin/**'), packageFiles('playwright-core', '**')],
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/showcase/**' }]
      : [],
  },
};

export default withNextIntl(nextConfig);

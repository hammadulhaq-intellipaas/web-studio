import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // The onboarding brief PDF is rendered server-side with @react-pdf/renderer, which ships
  // its own layout engine and must not be bundled by the app compiler.
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default withNextIntl(nextConfig);

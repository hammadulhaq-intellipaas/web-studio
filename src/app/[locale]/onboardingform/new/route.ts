import { NextResponse, type NextRequest } from 'next/server';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import { createForm } from '@/lib/onboarding/records';

export const dynamic = 'force-dynamic';

/**
 * Mints a blank form and sends the client to its resume link. A route handler rather
 * than a page so a top-level navigation (which carries the Basic-auth challenge) is the
 * only way to create a form — no prefetch, no crawler, no fetch() from elsewhere.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 404 });
  }
  const id = await createForm(locale);
  const target = getPathname({ locale, href: `/onboardingform/${id}` });
  return NextResponse.redirect(new URL(target, request.url), 303);
}

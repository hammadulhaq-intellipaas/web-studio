import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import { isValidSessionId } from '@/lib/session-id';
import type { Locale } from '@/lib/types';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { loadBrief, loadFiles, loadForm, publicFiles } from '@/lib/onboarding/records';
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { OnboardingShell } from '@/components/onboarding/OnboardingShell';
import { BODY, gradButton } from '@/components/funnel/ui';

export const dynamic = 'force-dynamic';

/**
 * The form itself: /onboardingform/<id> is both the working URL and the resume link.
 * The server hands the client the definition and the current record; everything after
 * that is the client shell talking to /api/onboarding/<id>.
 */
export default async function OnboardingFormPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;

  const record = isValidSessionId(id) ? await loadForm(id) : null;
  if (!record) {
    const t = await getTranslations('onboarding.shell');
    return (
      <OnboardingFrame header={<OnboardingHeader />}>
        <section style={{ padding: '80px 0', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, margin: '0 0 12px' }}>{t('notFoundTitle')}</h1>
          <p style={{ fontSize: 15.5, color: BODY, margin: '0 0 28px' }}>{t('notFoundBody')}</p>
          <a
            href={getPathname({ locale: loc, href: '/onboardingform/new' })}
            style={{ ...gradButton, display: 'inline-block', textDecoration: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700 }}
          >
            {t('startNew')}
          </a>
        </section>
      </OnboardingFrame>
    );
  }

  const [definition, files, brief] = await Promise.all([
    getOnboardingDefinition(),
    loadFiles(id),
    loadBrief(id, record.brief_version),
  ]);

  return (
    <OnboardingShell
      definition={definition}
      initialRecord={record}
      initialFiles={publicFiles(files)}
      initialBrief={brief}
    />
  );
}

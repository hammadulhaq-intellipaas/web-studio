import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/lib/types';
import { getOnboardingDefinition } from '@/lib/onboarding/definition';
import { fillPlaceholders, textFor } from '@/lib/onboarding/texts';
import { OnboardingFrame } from '@/components/onboarding/OnboardingFrame';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { BODY, BORDER, CheckIcon, gradButton, INK } from '@/components/funnel/ui';

export const dynamic = 'force-dynamic';

/**
 * Landing: what the form is, how long it takes, what comes out — all CMS copy. "Start"
 * is a plain anchor to the minting route (no prefetch: prefetching would create forms).
 */
export default async function OnboardingLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('onboarding.landing');
  const definition = await getOnboardingDefinition();
  const loc = locale as Locale;
  const minutes = definition.settings.estimatedMinutes;

  const landing = textFor(definition.texts, 'landing', loc);
  const whatYouGet = textFor(definition.texts, 'landing_what_you_get', loc);
  const startHref = getPathname({ locale: loc, href: '/onboardingform/new' });

  const badges = [
    t('badgeMinutes', { minutes }),
    t('badgeAutosave'),
    t('badgeNoLogin'),
    t('badgeLanguages'),
  ];

  return (
    <OnboardingFrame header={<OnboardingHeader />}>
      <section
        data-screen="onboarding-landing"
        style={{
          animation: 'ipFade .5s ease both',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '64px 0 80px',
        }}
      >
        <Image src="/intellipaas-logo.png" alt="" width={96} height={96} priority style={{ height: 96, width: 'auto', marginBottom: 10 }} />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: '#7A879B',
            marginBottom: 14,
          }}
        >
          {t('eyebrow')}
        </span>
        <h1
          style={{
            fontSize: 'clamp(30px,4.5vw,44px)',
            fontWeight: 800,
            letterSpacing: -1.1,
            lineHeight: 1.12,
            margin: '0 0 18px',
            maxWidth: 720,
            textWrap: 'balance',
          }}
        >
          {landing?.title}
        </h1>
        <div className="onb-markdown" style={{ fontSize: 17, lineHeight: 1.6, color: BODY, maxWidth: 600, textWrap: 'pretty' }}>
          <ReactMarkdown>{fillPlaceholders(landing?.content_markdown ?? '', { minutes })}</ReactMarkdown>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 10,
            margin: '26px 0 34px',
            maxWidth: 660,
          }}
        >
          {badges.map((label) => (
            <span
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                fontWeight: 600,
                color: INK,
                background: '#ffffff',
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: '8px 14px',
              }}
            >
              <CheckIcon />
              {label}
            </span>
          ))}
        </div>
        <a
          href={startHref}
          data-testid="onb-start"
          className="hov-cta"
          style={{
            ...gradButton,
            display: 'inline-block',
            textDecoration: 'none',
            borderRadius: 14,
            padding: '17px 44px',
            fontSize: 17,
            fontWeight: 700,
            boxShadow: '0 10px 26px -8px rgba(30,79,214,.55)',
          }}
        >
          {t('cta')}
        </a>

        {whatYouGet && (
          <div
            style={{
              marginTop: 56,
              width: '100%',
              maxWidth: 640,
              background: '#ffffff',
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: '24px 28px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: '#7A879B',
                marginBottom: 12,
              }}
            >
              {whatYouGet.title || t('whatYouGet')}
            </div>
            <div className="onb-markdown onb-markdown--list" style={{ fontSize: 15, lineHeight: 1.6, color: BODY }}>
              <ReactMarkdown>{whatYouGet.content_markdown}</ReactMarkdown>
            </div>
          </div>
        )}
      </section>
    </OnboardingFrame>
  );
}

import { Footer } from '@/components/funnel/Footer';

/**
 * Page chrome shared by every onboarding screen: the same page background, type and
 * footer as the configurator, so the two feel like one product.
 */
export function OnboardingFrame({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      data-onboarding-root
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F5F7FB',
        fontFamily: "var(--font-inter), Inter, 'Helvetica Neue', sans-serif",
        color: '#0F2440',
      }}
    >
      {header}
      <main style={{ flex: 1, width: '100%', maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>{children}</main>
      <Footer />
    </div>
  );
}

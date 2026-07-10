'use client';

import { useSyncExternalStore } from 'react';
import type { Catalog } from '@/lib/types';
import { useFunnel } from '@/stores/funnel';
import { CatalogProvider } from './CatalogContext';
import { useSessionSync } from './useSessionSync';
import { Header } from './Header';
import { Footer } from './Footer';
import { IntroScreen } from './IntroScreen';
import { PersonaStep } from './PersonaStep';
import { QuestionsStep } from './QuestionsStep';
import { ConfiguratorStep } from './ConfiguratorStep';
import { LeadStep } from './LeadStep';
import { DoneScreen } from './DoneScreen';

export function FunnelShell({ catalog }: { catalog: Catalog }) {
  const step = useFunnel((s) => s.step);
  // Adopts/restores the shareable session and mirrors state to the server.
  useSessionSync();
  // Avoid hydration mismatches: the persisted store only exists client-side,
  // so the server (and first client render) always shows the intro.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <CatalogProvider catalog={catalog}>
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F5F7FB',
        fontFamily: "var(--font-inter), Inter, 'Helvetica Neue', sans-serif",
        color: '#0F2440',
      }}
    >
      <Header />
      <main style={{ flex: 1, width: '100%', maxWidth: 1140, margin: '0 auto', padding: '0 24px' }}>
        {!hydrated || step === 'intro' ? (
          <IntroScreen catalog={catalog} />
        ) : step === 'persona' ? (
          <PersonaStep catalog={catalog} />
        ) : step === 'questions' ? (
          <QuestionsStep catalog={catalog} />
        ) : step === 'config' ? (
          <ConfiguratorStep catalog={catalog} />
        ) : step === 'lead' ? (
          <LeadStep catalog={catalog} />
        ) : (
          <DoneScreen catalog={catalog} />
        )}
      </main>
      <Footer />
    </div>
    </CatalogProvider>
  );
}

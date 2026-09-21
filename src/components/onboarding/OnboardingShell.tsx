'use client';

import type { FileSummary } from '@/lib/onboarding/export';
import type { OnboardingBrief, OnboardingDefinition, OnboardingFormRecord } from '@/lib/onboarding/types';
import { OnboardingFrame } from './OnboardingFrame';
import { OnboardingHeader } from './OnboardingHeader';

export type PublicFile = FileSummary & { id: string };

/** Placeholder until the form UI lands in the next step: proves the record round-trips. */
export function OnboardingShell({
  definition,
  initialRecord,
  initialFiles,
  initialBrief,
}: {
  definition: OnboardingDefinition;
  initialRecord: OnboardingFormRecord;
  initialFiles: PublicFile[];
  initialBrief: OnboardingBrief | null;
}) {
  return (
    <OnboardingFrame header={<OnboardingHeader progress={0} />}>
      <section style={{ padding: '52px 0 72px', maxWidth: 720 }} data-screen="onboarding-shell">
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6 }}>{definition.screens[0]?.title_de}</h2>
        <pre style={{ fontSize: 12, background: '#fff', border: '1px solid #E4E9F2', borderRadius: 12, padding: 16 }}>
          {JSON.stringify(
            { id: initialRecord.id, status: initialRecord.status, rev: initialRecord.rev, files: initialFiles.length, brief: initialBrief?.version ?? null },
            null,
            2,
          )}
        </pre>
      </section>
    </OnboardingFrame>
  );
}

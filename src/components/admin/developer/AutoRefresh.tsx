'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Reloads the page's data every few seconds while something runs in the background. */
export function AutoRefresh({ active, seconds = 10 }: { active: boolean; seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [active, seconds, router]);
  return null;
}

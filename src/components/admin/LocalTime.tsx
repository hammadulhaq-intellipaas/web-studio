'use client';

import { useSyncExternalStore } from 'react';

const DATE_TIME: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

const DATE_ONLY: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const subscribe = () => () => {};

/**
 * Renders a stored UTC timestamp in the viewer's own timezone.
 *
 * Timestamps come from the server, which runs in UTC, so formatting there always shows
 * UTC. Formatting must happen in the browser instead. The server (and the first client
 * render) format in UTC so hydration matches; once hydrated the component re-renders and
 * formats in the local timezone.
 */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const opts = dateOnly ? DATE_ONLY : DATE_TIME;
  const text = new Date(iso).toLocaleString('en-IE', {
    ...opts,
    ...(hydrated ? {} : { timeZone: 'UTC' }),
  });

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

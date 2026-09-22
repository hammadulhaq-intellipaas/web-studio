import { describe, expect, it } from 'vitest';
import { shouldCaptureBoundary } from '@/lib/quotes/versions';

const IDLE = 10 * 60_000;
const T0 = Date.parse('2026-09-22T10:00:00Z');
const at = (ms: number) => new Date(T0 + ms).toISOString();

describe('shouldCaptureBoundary', () => {
  it('captures nothing while the same actor keeps editing within the idle window', () => {
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: 'customer' }, T0 + 2000, 'customer', IDLE)).toBeNull();
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: 'customer' }, T0 + IDLE, 'customer', IDLE)).toBeNull();
  });

  it('closes the previous burst once the idle window has passed', () => {
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: 'customer' }, T0 + IDLE + 1, 'customer', IDLE)).toBe('idle');
  });

  it('closes the burst when the writer changes, even without a pause', () => {
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: 'customer' }, T0 + 500, 'team:matt@intellipaas.io', IDLE)).toBe('actor_change');
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: 'team:matt@intellipaas.io' }, T0 + 500, 'customer', IDLE)).toBe('actor_change');
  });

  it('treats rows written before actors were recorded as the customer', () => {
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: null }, T0 + 500, 'customer', IDLE)).toBeNull();
    expect(shouldCaptureBoundary({ updatedAt: at(0), lastActor: null }, T0 + 500, 'team:x@y.z', IDLE)).toBe('actor_change');
  });

  it('never fires on an unparsable timestamp', () => {
    expect(shouldCaptureBoundary({ updatedAt: 'nope', lastActor: 'customer' }, T0, 'customer', IDLE)).toBeNull();
  });
});

// Runs once after the whole suite: removes every row the tests created on the
// shared cloud DB (leads + cascaded files/plans, test appointments, E2E vouchers).
import { cleanupTestData } from './helpers/db';

export default async function globalTeardown() {
  try {
    await cleanupTestData();
    // eslint-disable-next-line no-console
    console.log('[e2e] teardown: test data cleaned up');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[e2e] teardown cleanup failed:', e);
  }
}

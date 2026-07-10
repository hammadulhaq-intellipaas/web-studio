/** URL-safe alphabet (nanoid's), minus look-alike ambiguity concerns for shareable links. */
const ALPHABET = 'useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict';
const LENGTH = 21;

const SESSION_ID_RE = new RegExp(`^[${ALPHABET.replace(/[-\]]/g, '\\$&')}]{${LENGTH}}$`);

/** Random, unguessable id for a funnel session — the `?c=` value in a shared link. */
export function generateSessionId(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}

export function isValidSessionId(id: string): boolean {
  return SESSION_ID_RE.test(id);
}

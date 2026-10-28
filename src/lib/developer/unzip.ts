import { inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  path: string;
  data: Buffer;
}

export interface UnzipLimits {
  maxEntries: number;
  maxTotalBytes: number;
}

const DEFAULT_LIMITS: UnzipLimits = { maxEntries: 3000, maxTotalBytes: 400 * 1024 * 1024 };

/** Junk that macOS and Windows put into archives. */
const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;

/**
 * Reads a .zip held in memory: stored and deflated entries, no encryption, no Zip64. Paths
 * that try to leave the archive (`..`, absolute, drive letters) are rejected, and the entry
 * count and the total unpacked size are capped so a malicious archive cannot exhaust memory.
 */
export function unzip(zip: Buffer, limits: UnzipLimits = DEFAULT_LIMITS): ZipEntry[] {
  // End of central directory: the last 0x06054b50 within 64 KB of the end.
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  if (count > limits.maxEntries) throw new Error(`The zip has more than ${limits.maxEntries} files`);

  const entries: ZipEntry[] = [];
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('Damaged zip: bad central directory');
    const method = zip.readUInt16LE(offset + 10);
    const compressed = zip.readUInt32LE(offset + 20);
    const size = zip.readUInt32LE(offset + 24);
    const nameLen = zip.readUInt16LE(offset + 28);
    const extraLen = zip.readUInt16LE(offset + 30);
    const commentLen = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    const rawName = zip.subarray(offset + 46, offset + 46 + nameLen).toString('utf8');
    offset += 46 + nameLen + extraLen + commentLen;

    if (compressed === 0xffffffff || size === 0xffffffff) throw new Error('Zip64 archives are not supported');
    const path = rawName.replace(/\\/g, '/');
    if (path.endsWith('/') || JUNK.test(path)) continue;
    if (path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').includes('..')) throw new Error(`Unsafe path in zip: ${rawName}`);

    total += size;
    if (total > limits.maxTotalBytes) throw new Error('The zip unpacks to more than the size limit');

    if (zip.readUInt32LE(local) !== 0x04034b50) throw new Error('Damaged zip: bad local header');
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + compressed);
    let data: Buffer;
    if (method === 0) data = Buffer.from(body);
    else if (method === 8) data = inflateRawSync(body);
    else throw new Error(`Unsupported compression in zip (method ${method})`);
    if (data.length !== size) throw new Error(`Damaged zip: ${path} has the wrong size`);
    entries.push({ path, data });
  }
  return stripCommonRoot(entries);
}

/** "design-export/index.html", "design-export/img/a.jpg" become "index.html", "img/a.jpg". */
export function stripCommonRoot(entries: ZipEntry[]): ZipEntry[] {
  if (!entries.length) return entries;
  const first = entries[0].path.split('/')[0];
  const shared = entries.every((e) => e.path.includes('/') && e.path.split('/')[0] === first);
  return shared ? entries.map((e) => ({ ...e, path: e.path.slice(first.length + 1) })) : entries;
}

/**
 * The page a design opens on: a top-level Claude Design export (`*.dc.html`), else a
 * top-level index.html, else the shallowest .html file.
 */
export function entryPage(paths: string[]): string | null {
  const html = paths.filter((p) => /\.html?$/i.test(p));
  const top = html.filter((p) => !p.includes('/'));
  return (
    top.find((p) => /\.dc\.html$/i.test(p)) ??
    top.find((p) => /^index\.html?$/i.test(p)) ??
    [...html].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0] ??
    null
  );
}

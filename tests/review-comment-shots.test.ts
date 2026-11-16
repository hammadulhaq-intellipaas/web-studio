import { describe, expect, it } from 'vitest';
import { DEVICE_WIDTH, promptOrder, shotGeometry, shotName } from '@/lib/developer/comment-order';
import { unzip } from '@/lib/developer/unzip';
import { crc32, zip } from '@/lib/developer/zip';

const c = (id: string, version_id: string, kind: 'pin' | 'general', created_at: string) => ({ id, version_id, kind, created_at });

describe('promptOrder', () => {
  it("numbers the iteration's own marked comments first, then the carried-over ones, each oldest first", () => {
    const list = [
      c('carry-late', 'other', 'pin', '2026-11-17T10:05:00Z'),
      c('own-late', 'v1', 'pin', '2026-11-17T10:03:00Z'),
      c('general', 'v1', 'general', '2026-11-17T09:00:00Z'),
      c('carry-early', 'other', 'pin', '2026-11-17T08:00:00Z'),
      c('own-early', 'v1', 'pin', '2026-11-17T10:01:00Z'),
    ];
    expect(promptOrder(list, 'v1').map((x) => x.id)).toEqual(['own-early', 'own-late', 'carry-early', 'carry-late']);
  });

  it('names the pictures after that order', () => {
    expect(shotName(0)).toBe('comment-01.jpg');
    expect(shotName(11)).toBe('comment-12.jpg');
  });
});

describe('shotGeometry', () => {
  const page = { width: 1280, height: 6000 };

  it('turns a drawn box from percentages into px and keeps some page around it', () => {
    const { box, clip } = shotGeometry({ x: 50, y: 1000, w: 25, h: 200 }, page);
    expect(box).toEqual({ x: 640, y: 1000, width: 320, height: 200 });
    // A narrow box shows the full width, so the section around it is recognisable.
    expect(clip.x).toBe(0);
    expect(clip.width).toBe(1280);
    expect(clip.y).toBe(840);
    expect(clip.height).toBe(200 + 2 * 160);
  });

  it('draws a small box around a tapped spot', () => {
    const { box } = shotGeometry({ x: 50, y: 500, w: null, h: null }, page);
    expect(box).toEqual({ x: 580, y: 460, width: 120, height: 80 });
  });

  it('stays inside the page at the top and caps a very tall box', () => {
    const top = shotGeometry({ x: 0, y: 20, w: 100, h: 100 }, page);
    expect(top.clip.y).toBe(0);
    const tall = shotGeometry({ x: 0, y: 100, w: 100, h: 5000 }, page);
    expect(tall.clip.height).toBe(1400);
  });

  it('knows the width of each review view', () => {
    expect(DEVICE_WIDTH).toEqual({ laptop: 1280, tablet: 768, phone: 390 });
  });
});

describe('zip', () => {
  it('writes an archive our own unzip reads back unchanged', () => {
    const files = [
      { path: 'comment-01.jpg', data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) },
      { path: 'comment-02.jpg', data: Buffer.from('second picture') },
    ];
    const back = unzip(zip(files));
    expect(back.map((f) => f.path)).toEqual(['comment-01.jpg', 'comment-02.jpg']);
    expect(back[0].data.equals(files[0].data)).toBe(true);
    expect(back[1].data.toString()).toBe('second picture');
  });

  it('computes the standard CRC-32', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926);
  });
});

import { describe, expect, it } from 'vitest';
import { composerPlace } from '@/lib/developer/review-place';

const area = { width: 1000, height: 700 };
const size = { width: 340, height: 210 };

describe('where the comment field opens', () => {
  it('opens to the right of the marked box when it fits', () => {
    expect(composerPlace({ left: 100, top: 200, width: 300, height: 120 }, area, size)).toEqual({ left: 412, top: 200, width: 340 });
  });

  it('opens to the left when the box is near the right edge', () => {
    expect(composerPlace({ left: 700, top: 200, width: 250, height: 120 }, area, size)).toEqual({ left: 348, top: 200, width: 340 });
  });

  it('opens below a box that spans the width, or above it when below has no room', () => {
    expect(composerPlace({ left: 20, top: 100, width: 960, height: 150 }, area, size)).toEqual({ left: 20, top: 262, width: 340 });
    expect(composerPlace({ left: 20, top: 450, width: 960, height: 200 }, area, size)).toEqual({ left: 20, top: 228, width: 340 });
  });

  it('stays inside the area: a box low on the screen keeps the field above the bottom edge', () => {
    const at = composerPlace({ left: 100, top: 640, width: 200, height: 40 }, area, size);
    expect(at.top + size.height).toBeLessThanOrEqual(area.height - 12);
    expect(at.left).toBe(312);
  });

  it('fits a phone-width area by narrowing and going below or above', () => {
    const phone = { width: 390, height: 640 };
    const at = composerPlace({ left: 30, top: 80, width: 330, height: 100 }, phone, size);
    expect(at).toEqual({ left: 30, top: 192, width: 340 });
    const narrow = composerPlace({ left: 10, top: 80, width: 300, height: 100 }, { width: 330, height: 640 }, size);
    expect(narrow.width).toBe(306);
    expect(narrow.left + narrow.width).toBeLessThanOrEqual(330 - 12);
  });
});

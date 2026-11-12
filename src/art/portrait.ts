// Generated 12x12 pixel faces. The same character id and color always give the same face.
import { hashString } from '../format/art';
import { mix } from '../format/theme';
import type { Rect } from './scenes';

export const PORTRAIT_SIZE = 12;

const SKIN = ['#E7B98F', '#D9A47E', '#E6D9CF', '#B98060', '#8A5A3C', '#F0CBA8'];
const HAIR = ['#3A2A1E', '#7A4A2E', '#B9B3C2', '#15131C', '#A0624A', '#D9B36A'];
const INK = '#15131C';

export function portraitRects(id: string, color: string): Rect[] {
  const h = hashString(id);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 3) % HAIR.length];
  const hairStyle = (h >>> 6) % 4;
  const face = (h >>> 9) % 3;
  const collar = (h >>> 12) % 2;
  const dark = mix(color, '#000000', 0.3);

  const rects: Rect[] = [[0, 0, 12, 12, '#2A2342']];
  // hair or hood, behind the face
  if (hairStyle === 0) rects.push([3, 1, 6, 2, hair], [2, 2, 8, 2, hair]);
  if (hairStyle === 1) rects.push([3, 1, 6, 2, hair], [2, 2, 8, 2, hair], [1, 4, 2, 8, hair], [9, 4, 2, 8, hair]);
  if (hairStyle === 2) rects.push([3, 0, 6, 2, color], [2, 1, 8, 3, color], [1, 3, 2, 9, color], [9, 3, 2, 9, color]);
  if (hairStyle === 3) rects.push([5, 0, 2, 1, hair], [3, 1, 6, 3, hair], [2, 3, 1, 3, hair], [9, 3, 1, 3, hair]);
  // face
  rects.push([3, 3, 6, 7, skin]);
  if (hairStyle !== 2) rects.push([3, 3, 6, 1, hair]);
  rects.push([4, 6, 1, 1, INK], [7, 6, 1, 1, INK]);
  if (face === 0) rects.push([5, 8, 2, 1, '#A0624A']);
  if (face === 1) rects.push([3, 7, 6, 3, hair], [5, 8, 2, 1, skin]);
  if (face === 2) rects.push([4, 5, 1, 1, hair], [7, 5, 1, 1, hair], [5, 8, 2, 1, '#9C4A5A']);
  // clothing in the character's color
  rects.push([2, 10, 8, 2, color], [3, 10, 6, 2, dark]);
  if (collar) rects.push([5, 10, 2, 1, skin]);
  return rects;
}

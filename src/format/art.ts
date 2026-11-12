import type { Story } from './types';

/** The 28 built-in pixel scenes. Any other name shows `default`. */
export const BUILTIN_ART = [
  'forest',
  'forest_night',
  'road',
  'road_dusk',
  'mountain_pass',
  'field',
  'camp',
  'river',
  'river_dusk',
  'marsh',
  'harbor',
  'sea_storm',
  'village',
  'village_night',
  'market',
  'tavern',
  'house_interior',
  'ruins',
  'abbey',
  'bell_tower',
  'crypt',
  'cave',
  'dungeon',
  'castle_gate',
  'castle_hall',
  'library',
  'throne_room',
  'default',
] as const;

export type BuiltinArt = (typeof BUILTIN_ART)[number];

const ART_SET: ReadonlySet<string> = new Set(BUILTIN_ART);

export function isBuiltinArt(name: unknown): name is BuiltinArt {
  return typeof name === 'string' && ART_SET.has(name);
}

export function isImagePath(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('images/');
}

/** The art for the library card: the cover, else the start scene's art, else `default`. */
export function storyCover(story: Story): string {
  return story.cover ?? story.scenes[story.start]?.art ?? 'default';
}

const NAME_COLORS = ['#3F7D5C', '#8A8494', '#9C4A5A', '#7A6FB0', '#3D6FB0', '#B07A3D', '#5C9AA8', '#A85C8E'];

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A character's color: the one given, or a stable one picked from the id. */
export function characterColor(id: string, color?: string): string {
  if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)) return color;
  return NAME_COLORS[hashString(id) % NAME_COLORS.length];
}

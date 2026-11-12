// The import checks for quest/1. A line-for-line port of tools/validate_quest.py:
// the two must report the same errors and warnings for every file in samples/ and tests/fixtures/.
import { z } from 'zod';
import { isBuiltinArt } from './art';
import { MAX_IMAGE_BYTES, repr } from './load';
import { contrast, PRESETS } from './theme';
import type { ImageMeta, Issue, Story, StoryStats, ValidationResult } from './types';

const ID_RE = /^[a-z][a-z0-9_-]{0,39}$/;
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function has(obj: Dict, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function checkTheme(theme: unknown, warn: (message: string) => void): void {
  if (theme === undefined || theme === null) return;
  if (!isDict(theme)) {
    warn('theme must be an object, ignored');
    return;
  }
  let preset = has(theme, 'preset') ? theme.preset : 'dusk';
  if (typeof preset !== 'string' || !has(PRESETS, preset)) {
    warn(`theme: unknown preset ${repr(preset)}, using dusk`);
    preset = 'dusk';
  }
  const colors: Record<string, string> = { ...PRESETS[preset as keyof typeof PRESETS] };
  const given = isDict(theme.colors) ? theme.colors : {};
  for (const [key, value] of Object.entries(given)) {
    if (!has(colors, key)) warn(`theme: unknown color ${repr(key)}, ignored`);
    else if (typeof value !== 'string' || !HEX_RE.test(value)) warn(`theme: ${key} ${repr(value)} is not #RRGGBB, ignored`);
    else colors[key] = value;
  }
  const font = has(theme, 'font') ? theme.font : 'serif';
  if (font !== 'serif' && font !== 'sans' && font !== 'pixel') warn(`theme: unknown font ${repr(font)}, using serif`);
  const t = contrast(colors.text, colors.background);
  if (t < 4.5) warn(`theme: text on background is ${t.toFixed(1)}:1, the app will adjust text to 4.5:1`);
  const a = contrast(colors.accent, colors.background);
  if (a < 3) warn(`theme: accent on background is ${a.toFixed(1)}:1, names and highlights will be faint`);
}

// Shapes, checked after the hand-written rules pass, so a story that reaches the library is well-typed.
const passageSchema = z.union([z.string(), z.looseObject({ speaker: z.string(), line: z.string() })]);
const sceneSchema = z.looseObject({
  title: z.string().optional(),
  art: z.string().optional(),
  text: z.array(passageSchema).min(1),
  prompt: z.string().optional(),
  choices: z.array(z.looseObject({ text: z.string(), to: z.string() })).optional(),
  ending: z.looseObject({ title: z.string(), tone: z.string().optional() }).optional(),
});
export const storySchema = z.looseObject({
  format: z.literal('quest/1'),
  id: z.string(),
  title: z.string(),
  author: z.string(),
  version: z.string().optional(),
  summary: z.string().optional(),
  cover: z.string().optional(),
  imageStyle: z.enum(['pixel', 'smooth']).optional(),
  start: z.string(),
  characters: z
    .array(
      z.looseObject({
        id: z.string(),
        name: z.string(),
        color: z.string().optional(),
        portrait: z.string().optional(),
        about: z.string().optional(),
      }),
    )
    .optional(),
  scenes: z.record(z.string(), sceneSchema),
});

const EMPTY_STATS: StoryStats = { scenes: 0, endings: 0, decisions: 0, images: 0 };

/**
 * Runs every check in docs/story-format.md, "Validation on Import".
 * `images` describes the bundled images of a package (empty for a plain .quest.json).
 */
export function validateStory(
  story: unknown,
  images: ReadonlyMap<string, ImageMeta> = new Map(),
  isPackage = false,
): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (message: string, scene?: string) => errors.push(scene === undefined ? { message } : { message, scene });
  const warn = (message: string, scene?: string) =>
    warnings.push(scene === undefined ? { message } : { message, scene });

  if (!isDict(story)) {
    err('the story must be a JSON object');
    return { errors, warnings, stats: { ...EMPTY_STATS, images: images.size } };
  }

  for (const [name, meta] of images) {
    if (meta.size > MAX_IMAGE_BYTES) err(`image ${repr(name)} is over 1 MB`);
    else if (!meta.readable) err(`image ${repr(name)} can't be read as an image`);
  }
  const used = new Set<string>();

  const checkArt = (value: unknown, where: string, kind: 'scene' | 'portrait', scene?: string) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.startsWith('images/')) {
      if (!isPackage) {
        warn(`${where}: ${repr(value)} is an image path, but a .quest.json can't carry images`, scene);
        return;
      }
      const meta = images.get(value);
      if (!meta) {
        const match = [...images.keys()].find((k) => k.toLowerCase() === value.toLowerCase());
        const hint = match ? ` (did you mean ${repr(match)}? case must match)` : '';
        warn(`${where}: image ${repr(value)} is not in the package${hint}`, scene);
        return;
      }
      used.add(value);
      if (meta.readable && meta.width && meta.height && meta.size <= MAX_IMAGE_BYTES) {
        const ratio = meta.width / meta.height;
        if (kind === 'scene' && !(ratio >= 1.6 && ratio <= 1.95)) {
          warn(`${where}: ${repr(value)} is ${meta.width}x${meta.height}, not about 16:9, it will be cropped`, scene);
        }
        if (kind === 'portrait' && !(ratio >= 0.9 && ratio <= 1.1)) {
          warn(`${where}: ${repr(value)} is ${meta.width}x${meta.height}, not square, it will be cropped`, scene);
        }
      }
    } else if (kind === 'portrait') {
      warn(`${where}: portrait must be a bundled image path`, scene);
    } else if (!isBuiltinArt(value)) {
      warn(`${where}: unknown art ${repr(value)}, will show default`, scene);
    }
  };

  if (story.format !== 'quest/1') err('format must be "quest/1"');
  for (const key of ['id', 'title', 'author', 'start', 'scenes']) {
    if (!has(story, key)) err(`missing ${key}`);
  }
  if (has(story, 'id') && !ID_RE.test(String(story.id))) err(`bad story id ${repr(story.id)}`);
  const imageStyle = has(story, 'imageStyle') ? story.imageStyle : 'pixel';
  if (imageStyle !== 'pixel' && imageStyle !== 'smooth') err('imageStyle must be "pixel" or "smooth"');
  checkArt(story.cover, 'cover', 'scene');
  checkTheme(story.theme, warn);

  const chars = new Set<string>();
  const characters = story.characters === undefined ? [] : story.characters;
  if (!Array.isArray(characters)) {
    err('characters must be a list');
  } else {
    for (const c of characters) {
      if (!isDict(c) || !has(c, 'id') || !has(c, 'name')) {
        err(`character missing id or name: ${JSON.stringify(c)}`);
        continue;
      }
      const id = String(c.id);
      if (!ID_RE.test(id)) err(`bad character id ${repr(c.id)}`);
      chars.add(id);
      checkArt(c.portrait, `character ${repr(id)}`, 'portrait');
    }
  }
  if (chars.size > 30) err('more than 30 characters');

  let scenes: Dict = {};
  if (has(story, 'scenes')) {
    if (isDict(story.scenes)) scenes = story.scenes;
    else err('scenes must be an object keyed by scene id');
  }
  const sceneIds = Object.keys(scenes);
  const start = story.start;
  const startOk = typeof start === 'string' && has(scenes, start);
  if (sceneIds.length > 500) err('more than 500 scenes');
  if (!startOk) err(`start ${repr(start)} is not a scene`);

  const endings = new Set<string>();
  let decisions = 0;
  const targets = (sid: string): string[] => {
    const s = scenes[sid];
    if (!isDict(s) || !Array.isArray(s.choices)) return [];
    return s.choices
      .filter((c): c is Dict => isDict(c) && typeof c.to === 'string' && has(scenes, c.to))
      .map((c) => c.to as string);
  };

  for (const sid of sceneIds) {
    const s = scenes[sid];
    const where = `scene ${repr(sid)}`;
    if (!ID_RE.test(sid)) err(`${where}: bad id`, sid);
    if (!isDict(s)) {
      err(`${where}: must be an object`, sid);
      continue;
    }
    let text = s.text;
    if (!Array.isArray(text) || text.length === 0) {
      err(`${where}: needs at least one passage`, sid);
      text = [];
    }
    (text as unknown[]).forEach((p, i) => {
      let body: unknown;
      if (typeof p === 'string') {
        body = p;
      } else if (isDict(p) && has(p, 'speaker') && has(p, 'line')) {
        body = p.line;
        if (typeof p.speaker !== 'string' || !chars.has(p.speaker)) {
          err(`${where} passage ${i}: unknown speaker ${repr(p.speaker)}`, sid);
        }
      } else {
        err(`${where} passage ${i}: must be a string or {speaker, line}`, sid);
        return;
      }
      if (typeof body === 'string' && [...body].length > 600) warn(`${where} passage ${i}: over 600 characters`, sid);
    });
    const hasChoices = has(s, 'choices');
    const hasEnding = has(s, 'ending');
    if (hasChoices === hasEnding) {
      err(`${where}: needs either choices or an ending, not ${hasChoices ? 'both' : 'neither'}`, sid);
    }
    if (hasChoices) {
      if (!Array.isArray(s.choices)) {
        err(`${where}: choices must be a list`, sid);
      } else {
        decisions += 1;
        const ch = s.choices as unknown[];
        if (!(ch.length >= 2 && ch.length <= 3)) err(`${where}: has ${ch.length} choices, needs 2 or 3`, sid);
        for (const c of ch) {
          const choice = isDict(c) ? c : {};
          if (!choice.text) err(`${where}: a choice has no text`, sid);
          if (typeof choice.to !== 'string' || !has(scenes, choice.to)) {
            err(`${where}: choice ${repr(choice.text)} points to missing scene ${repr(choice.to)}`, sid);
          }
        }
      }
    }
    if (hasEnding) {
      endings.add(sid);
      const e = isDict(s.ending) ? s.ending : {};
      if (!e.title) err(`${where}: ending needs a title`, sid);
      const tone = has(e, 'tone') ? e.tone : 'neutral';
      if (tone !== 'good' && tone !== 'bad' && tone !== 'neutral') {
        err(`${where}: ending tone must be good, bad or neutral`, sid);
      }
    }
    checkArt(s.art, where, 'scene', sid);
  }
  if (endings.size === 0) err('no ending scenes');

  for (const name of [...images.keys()].filter((k) => !used.has(k)).sort()) {
    warn(`image ${repr(name)} is never used`);
  }

  const reach = new Set<string>();
  const todo: string[] = startOk ? [start as string] : [];
  while (todo.length) {
    const sid = todo.pop()!;
    if (!reach.has(sid)) {
      reach.add(sid);
      todo.push(...targets(sid));
    }
  }
  for (const sid of sceneIds) {
    if (!reach.has(sid)) warn(`scene ${repr(sid)} is unreachable from start`, sid);
  }

  const canEnd = new Set(endings);
  let changed = true;
  while (changed) {
    changed = false;
    for (const sid of sceneIds) {
      if (!canEnd.has(sid) && targets(sid).some((n) => canEnd.has(n))) {
        canEnd.add(sid);
        changed = true;
      }
    }
  }
  for (const sid of sceneIds) {
    if (!canEnd.has(sid)) warn(`scene ${repr(sid)} can never reach an ending`, sid);
  }

  // A last shape check, for things the rules above don't name (a title that is a number, say).
  if (errors.length === 0) {
    const parsed = storySchema.safeParse(story);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 10)) {
        const path = issue.path.join('.');
        const scene = issue.path[0] === 'scenes' && typeof issue.path[1] === 'string' ? issue.path[1] : undefined;
        err(`${path || 'story'}: ${issue.message}`, scene);
      }
    }
  }

  return {
    errors,
    warnings,
    stats: { scenes: sceneIds.length, endings: endings.size, decisions, images: images.size },
  };
}

/** Narrows a story that passed validation with no errors. */
export function asStory(story: unknown): Story {
  return story as Story;
}

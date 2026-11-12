// The whole import check for one file: read it, parse it, validate it.
import { loadStoryBytes } from './load';
import type { ImageMeta, Issue, Story, StoryStats } from './types';
import { asStory, validateStory } from './validate';

export interface CheckedFile {
  /** The story, only when there are no errors. */
  story: Story | null;
  /** Whatever the JSON held, for showing a preview even when there are errors. */
  raw: unknown;
  isPackage: boolean;
  images: Map<string, Uint8Array>;
  imageMeta: Map<string, ImageMeta>;
  errors: Issue[];
  warnings: Issue[];
  stats: StoryStats;
  sizeBytes: number;
}

export function checkStoryBytes(bytes: Uint8Array): CheckedFile {
  const loaded = loadStoryBytes(bytes);
  const base = {
    isPackage: loaded.isPackage,
    images: loaded.images,
    imageMeta: loaded.imageMeta,
    sizeBytes: bytes.length,
  };
  const errors: Issue[] = loaded.errors.map((message) => ({ message }));
  const noStats = { scenes: 0, endings: 0, decisions: 0, images: loaded.imageMeta.size };
  if (loaded.storyBytes === null) {
    return { ...base, story: null, raw: null, errors, warnings: [], stats: noStats };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(loaded.storyBytes));
  } catch (e) {
    errors.push({ message: `not valid JSON: ${e instanceof Error ? e.message : String(e)}` });
    return { ...base, story: null, raw: null, errors, warnings: [], stats: noStats };
  }
  const result = validateStory(raw, loaded.imageMeta, loaded.isPackage);
  errors.push(...result.errors);
  return {
    ...base,
    story: errors.length === 0 ? asStory(raw) : null,
    raw,
    errors,
    warnings: result.warnings,
    stats: result.stats,
  };
}

export interface ParsedFile extends CheckedFile {
  name: string;
}

/** Reads and checks a picked or downloaded file. Judges by content, not by extension. */
export async function parseStoryFile(file: Blob, name: string): Promise<ParsedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { ...checkStoryBytes(bytes), name };
}

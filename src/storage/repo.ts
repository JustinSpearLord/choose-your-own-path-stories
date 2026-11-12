// Reads and writes for stories, images, looks, runs and settings.
import { noteCount, rewind, startRun } from '../engine/run';
import type { Run } from '../engine/types';
import { imageMime } from '../format/imageInfo';
import type { ImageMeta, PlayerLook, Story } from '../format/types';
import { db, type ImageRecord, type StoryRecord } from './db';

const nowIso = () => new Date().toISOString();

// ---- stories ----

export async function listStories(): Promise<StoryRecord[]> {
  const all = await db.stories.toArray();
  return all.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export function getStory(id: string): Promise<StoryRecord | undefined> {
  return db.stories.get(id);
}

export interface NewStory {
  story: Story;
  isPackage: boolean;
  sizeBytes: number;
  images: ReadonlyMap<string, Uint8Array>;
  imageMeta: ReadonlyMap<string, ImageMeta>;
  sourceUrl?: string;
}

export function toImageRecords(
  storyId: string,
  images: ReadonlyMap<string, Uint8Array>,
  meta: ReadonlyMap<string, ImageMeta>,
): ImageRecord[] {
  const out: ImageRecord[] = [];
  for (const [path, data] of images) {
    const m = meta.get(path);
    if (!m?.readable) continue;
    out.push({ storyId, path, data, type: imageMime(path), width: m.width ?? 0, height: m.height ?? 0 });
  }
  return out;
}

/** Adds a story, or replaces the installed version of it (its images are replaced too). */
export async function saveStory(input: NewStory, now: string = nowIso()): Promise<StoryRecord> {
  const { story } = input;
  const existing = await db.stories.get(story.id);
  const record: StoryRecord = {
    id: story.id,
    version: story.version ?? '',
    title: story.title,
    author: story.author,
    summary: story.summary ?? '',
    story,
    isPackage: input.isPackage,
    importedAt: existing?.importedAt ?? now,
    updatedAt: now,
    sizeBytes: input.sizeBytes,
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
  };
  await db.transaction('rw', db.stories, db.images, async () => {
    await db.images.where('storyId').equals(story.id).delete();
    await db.stories.put(record);
    await db.images.bulkPut(toImageRecords(story.id, input.images, input.imageMeta));
  });
  return record;
}

/** Removes a story with its images, look, saved paths and notes. */
export async function deleteStory(id: string): Promise<void> {
  await db.transaction('rw', db.stories, db.images, db.looks, db.runs, async () => {
    await db.images.where('storyId').equals(id).delete();
    await db.runs.where('storyId').equals(id).delete();
    await db.looks.delete(id);
    await db.stories.delete(id);
  });
}

export function getImages(storyId: string): Promise<ImageRecord[]> {
  return db.images.where('storyId').equals(storyId).toArray();
}

export function getImage(storyId: string, path: string): Promise<ImageRecord | undefined> {
  return db.images.get([storyId, path]);
}

// ---- looks ----

export async function getLook(storyId: string): Promise<PlayerLook | null> {
  const rec = await db.looks.get(storyId);
  if (!rec) return null;
  const { storyId: _omit, ...look } = rec;
  void _omit;
  return look;
}

export async function saveLook(storyId: string, look: PlayerLook): Promise<void> {
  await db.looks.put({ ...look, storyId });
}

// ---- runs ----

export function getRun(runId: string): Promise<Run | undefined> {
  return db.runs.get(runId);
}

export async function listRuns(storyId?: string): Promise<Run[]> {
  const runs = storyId ? await db.runs.where('storyId').equals(storyId).toArray() : await db.runs.toArray();
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Saves a run. If it is the current run, every other run of the story stops being current. */
export async function saveRun(run: Run): Promise<void> {
  await db.transaction('rw', db.runs, async () => {
    if (run.isCurrent) {
      const others = await db.runs.where('storyId').equals(run.storyId).toArray();
      for (const other of others) {
        if (other.runId !== run.runId && other.isCurrent) await db.runs.put({ ...other, isCurrent: false });
      }
    }
    await db.runs.put(run);
  });
}

export async function deleteRun(runId: string): Promise<void> {
  await db.runs.delete(runId);
}

/** The run Continue resumes for this story, if any. */
export async function currentRun(storyId: string): Promise<Run | undefined> {
  const runs = await db.runs.where('storyId').equals(storyId).toArray();
  return runs.find((r) => r.isCurrent);
}

async function nextRunName(story: Story): Promise<string> {
  const count = await db.runs.where('storyId').equals(story.id).count();
  return `${story.title} run ${count + 1}`;
}

/** Starts a new run of a story from its first scene and makes it the current one. */
export async function startNewRun(story: Story): Promise<Run> {
  const run = startRun(story, { name: await nextRunName(story) });
  await saveRun(run);
  return run;
}

/** Rewinds to a decision: saves a new current run; the run rewound from is left exactly as it was. */
export async function rewindRun(run: Run, stepIndex: number, story?: Story): Promise<Run> {
  const name = story ? await nextRunName(story) : undefined;
  const next = rewind(run, stepIndex, { story, name });
  await db.transaction('rw', db.runs, async () => {
    // Only the "current" flag moves; nothing else about other runs changes.
    const others = await db.runs.where('storyId').equals(run.storyId).toArray();
    for (const other of others) {
      if (other.isCurrent) await db.runs.update(other.runId, { isCurrent: false });
    }
    await db.runs.put(next);
  });
  return next;
}

// ---- meta ----

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

// ---- totals ----

export interface Totals {
  stories: number;
  paths: number;
  notes: number;
  bytes: number;
}

export async function totals(): Promise<Totals> {
  const [stories, runs, images] = await Promise.all([db.stories.toArray(), db.runs.toArray(), db.images.toArray()]);
  let bytes = 0;
  for (const s of stories) bytes += JSON.stringify(s.story).length;
  for (const i of images) bytes += i.data.byteLength;
  for (const r of runs) bytes += JSON.stringify(r).length;
  return {
    stories: stories.length,
    paths: runs.length,
    notes: runs.reduce((n, r) => n + noteCount(r), 0),
    bytes,
  };
}

/** Asks the browser not to clear this app's data. Safe to call often; never throws. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

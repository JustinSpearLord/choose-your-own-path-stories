// Backup and restore: one zip with backup.json plus each story's story.json and images.
import { unzipSync, zipSync, type Zippable } from 'fflate';
import { z } from 'zod';
import { endingsFound } from '../engine/run';
import type { Run } from '../engine/types';
import { imageMime, readImageInfo } from '../format/imageInfo';
import { isUnsafePath, MAX_IMAGE_BYTES } from '../format/load';
import { isFontName, isHexColor, isPresetName } from '../format/theme';
import type { ImageMeta, PlayerLook, Story } from '../format/types';
import { asStory, validateStory } from '../format/validate';
import { applyUpdateToRuns, compareVersions } from '../import/update';
import { db, type ImageRecord, type LookRecord, type StoryRecord } from './db';
import { setMeta } from './repo';

export const BACKUP_FORMAT = 'quest-backup/1';
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;

const noteSchema = z.object({ passage: z.number().int().nullable(), text: z.string(), at: z.string() });
const snapshotSchema = z.object({
  title: z.string(),
  art: z.string(),
  passages: z.array(z.union([z.string(), z.object({ speaker: z.string(), line: z.string() })])),
  prompt: z.string(),
  choices: z.array(z.object({ text: z.string(), to: z.string() })),
  ending: z.object({ title: z.string(), tone: z.enum(['good', 'bad', 'neutral']) }).optional(),
  speakers: z.record(z.string(), z.object({ name: z.string(), color: z.string(), portrait: z.string().optional() })),
});
const stepSchema = z.object({
  sceneId: z.string(),
  snapshot: snapshotSchema,
  notes: z.array(noteSchema),
  choice: z.object({ index: z.number().int(), text: z.string(), to: z.string() }).optional(),
  skipped: z.array(z.string()),
  choiceNote: z.string().optional(),
  enteredAt: z.string(),
});
const runSchema = z.object({
  runId: z.string().min(1),
  storyId: z.string(),
  storyVersion: z.string(),
  name: z.string(),
  status: z.enum(['active', 'finished', 'left']),
  isCurrent: z.boolean(),
  startedAt: z.string(),
  updatedAt: z.string(),
  finishedAt: z.string().optional(),
  endingSceneId: z.string().optional(),
  parentRunId: z.string().optional(),
  playedMs: z.number().default(0),
  steps: z.array(stepSchema).min(1),
});
const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  createdAt: z.string().optional(),
  stories: z.array(
    z.looseObject({
      id: z.string(),
      isPackage: z.boolean().optional(),
      importedAt: z.string().optional(),
      updatedAt: z.string().optional(),
      sizeBytes: z.number().optional(),
      sourceUrl: z.string().optional(),
    }),
  ),
  looks: z.array(z.looseObject({ storyId: z.string(), mode: z.string() })).default([]),
  runs: z.array(z.unknown()).default([]),
});

export interface BackupFile {
  blob: Blob;
  name: string;
  bytes: number;
}

export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `quest-journal-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.zip`;
}

/** Packs everything on the device into one zip. */
export async function buildBackupBytes(now: Date = new Date()): Promise<Uint8Array> {
  const [stories, images, looks, runs] = await Promise.all([
    db.stories.toArray(),
    db.images.toArray(),
    db.looks.toArray(),
    db.runs.toArray(),
  ]);
  const files: Zippable = {};
  const enc = new TextEncoder();
  for (const s of stories) {
    files[`stories/${s.id}/story.json`] = enc.encode(JSON.stringify(s.story, null, 2));
  }
  for (const img of images) {
    // Images are already compressed: store them as they are.
    files[`stories/${img.storyId}/${img.path}`] = [img.data, { level: 0 }];
  }
  const endings = stories.flatMap((s) =>
    endingsFound(runs.filter((r) => r.storyId === s.id)).map((e) => ({
      storyId: s.id,
      scene: e.sceneId,
      title: e.title,
      tone: e.tone,
      foundAt: e.foundAt,
    })),
  );
  const manifest = {
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    stories: stories.map((s) => ({
      id: s.id,
      version: s.version,
      title: s.title,
      author: s.author,
      summary: s.summary,
      isPackage: s.isPackage,
      importedAt: s.importedAt,
      updatedAt: s.updatedAt,
      sizeBytes: s.sizeBytes,
      ...(s.sourceUrl ? { sourceUrl: s.sourceUrl } : {}),
    })),
    looks,
    runs,
    endings,
  };
  files['backup.json'] = enc.encode(JSON.stringify(manifest, null, 2));
  return zipSync(files, { level: 6 });
}

export async function buildBackup(now: Date = new Date()): Promise<BackupFile> {
  const bytes = await buildBackupBytes(now);
  return { blob: new Blob([bytes as BlobPart], { type: 'application/zip' }), name: backupFileName(now), bytes: bytes.length };
}

export function markBackedUp(now: Date = new Date()): Promise<void> {
  return setMeta('lastBackupAt', now.toISOString());
}

export interface RestoreSummary {
  storiesAdded: number;
  storiesUpdated: number;
  storiesKept: number;
  storiesSkipped: number;
  runsAdded: number;
  runsUpdated: number;
  looksAdded: number;
}

function cleanLook(raw: Record<string, unknown>): PlayerLook | null {
  const mode = raw.mode;
  const font = isFontName(raw.font) ? { font: raw.font } : {};
  if (mode === 'author') return { mode, ...font };
  if (isPresetName(mode)) return { mode, ...font };
  if (mode === 'custom' && raw.colors && typeof raw.colors === 'object') {
    const c = raw.colors as Record<string, unknown>;
    if (isHexColor(c.background) && isHexColor(c.panel) && isHexColor(c.text) && isHexColor(c.accent)) {
      return {
        mode,
        colors: { background: c.background, panel: c.panel, text: c.text, accent: c.accent },
        ...font,
      };
    }
  }
  return null;
}

/**
 * Adds everything from a backup. Nothing on the device is deleted: a story in both keeps the newer
 * version, runs merge by id, and looks already on the device win.
 */
export async function restoreBackup(bytes: Uint8Array): Promise<RestoreSummary> {
  if (bytes.length > MAX_BACKUP_BYTES) throw new Error('That file is too big to be a backup.');
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, {
      filter: (f) =>
        !isUnsafePath(f.name) &&
        !f.name.endsWith('/') &&
        (f.name === 'backup.json' || /^stories\/[^/]+\/(story\.json|images\/.+\.(png|webp))$/i.test(f.name)) &&
        f.originalSize <= 20 * 1024 * 1024,
    });
  } catch {
    throw new Error('That file is not a backup this app made (it is not a zip file).');
  }
  if (!files['backup.json']) throw new Error('That zip has no backup.json, so it is not a Quest Journal backup.');
  let manifest: z.infer<typeof backupSchema>;
  try {
    manifest = backupSchema.parse(JSON.parse(new TextDecoder().decode(files['backup.json'])));
  } catch {
    throw new Error('The backup.json in that file can’t be read, or is from a newer version of the app.');
  }

  const summary: RestoreSummary = {
    storiesAdded: 0,
    storiesUpdated: 0,
    storiesKept: 0,
    storiesSkipped: 0,
    runsAdded: 0,
    runsUpdated: 0,
    looksAdded: 0,
  };
  const now = new Date().toISOString();

  await db.transaction('rw', db.stories, db.images, db.looks, db.runs, async () => {
    const present = new Map<string, Story>();
    for (const s of await db.stories.toArray()) present.set(s.id, s.story);

    for (const entry of manifest.stories) {
      const raw = files[`stories/${entry.id}/story.json`];
      if (!raw) {
        summary.storiesSkipped += 1;
        continue;
      }
      // Stories in a backup are checked like any imported file.
      const prefix = `stories/${entry.id}/`;
      const images = new Map<string, Uint8Array>();
      const meta = new Map<string, ImageMeta>();
      for (const [name, data] of Object.entries(files)) {
        if (!name.startsWith(`${prefix}images/`) || data.length > MAX_IMAGE_BYTES) continue;
        const path = name.slice(prefix.length);
        const info = readImageInfo(data);
        if (!info) continue;
        images.set(path, data);
        meta.set(path, { size: data.length, readable: true, width: info.width, height: info.height });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        summary.storiesSkipped += 1;
        continue;
      }
      const isPackage = entry.isPackage ?? images.size > 0;
      const check = validateStory(parsed, meta, isPackage);
      if (check.errors.length || (parsed as { id?: unknown }).id !== entry.id) {
        summary.storiesSkipped += 1;
        continue;
      }
      const story = asStory(parsed);
      const existing = await db.stories.get(story.id);
      if (existing && compareVersions(story.version, existing.version) <= 0) {
        summary.storiesKept += 1;
        continue;
      }
      const record: StoryRecord = {
        id: story.id,
        version: story.version ?? '',
        title: story.title,
        author: story.author,
        summary: story.summary ?? '',
        story,
        isPackage,
        importedAt: existing?.importedAt ?? entry.importedAt ?? now,
        updatedAt: existing ? now : (entry.updatedAt ?? now),
        sizeBytes: entry.sizeBytes ?? raw.length,
        ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
      };
      await db.images.where('storyId').equals(story.id).delete();
      await db.stories.put(record);
      const records: ImageRecord[] = [...images].map(([path, data]) => ({
        storyId: story.id,
        path,
        data,
        type: imageMime(path),
        width: meta.get(path)?.width ?? 0,
        height: meta.get(path)?.height ?? 0,
      }));
      await db.images.bulkPut(records);
      if (existing) {
        summary.storiesUpdated += 1;
        const mine = await db.runs.where('storyId').equals(story.id).toArray();
        for (const run of applyUpdateToRuns(mine, story, now)) await db.runs.put(run);
      } else {
        summary.storiesAdded += 1;
      }
      present.set(story.id, story);
    }

    for (const raw of manifest.runs) {
      const parsed = runSchema.safeParse(raw);
      if (!parsed.success || !present.has(parsed.data.storyId)) continue;
      const run = parsed.data as Run;
      const existing = await db.runs.get(run.runId);
      if (existing) {
        if (run.updatedAt > existing.updatedAt) {
          await db.runs.put({ ...run, isCurrent: existing.isCurrent });
          summary.runsUpdated += 1;
        }
        continue;
      }
      const others = await db.runs.where('storyId').equals(run.storyId).toArray();
      const hasCurrent = others.some((r) => r.isCurrent);
      await db.runs.put({ ...run, isCurrent: run.isCurrent && !hasCurrent });
      summary.runsAdded += 1;
    }

    // An unfinished run restored into a newer installed version follows the same rules as an update.
    for (const [storyId, story] of present) {
      const mine = await db.runs.where('storyId').equals(storyId).toArray();
      const stale = mine.filter((r) => r.status === 'active' && r.storyVersion !== (story.version ?? ''));
      for (const run of applyUpdateToRuns(stale, story, now)) await db.runs.put(run);
    }

    for (const raw of manifest.looks) {
      if (!present.has(raw.storyId) || (await db.looks.get(raw.storyId))) continue;
      const look = cleanLook(raw);
      if (!look) continue;
      await db.looks.put({ ...look, storyId: raw.storyId } as LookRecord);
      summary.looksAdded += 1;
    }
  });
  return summary;
}

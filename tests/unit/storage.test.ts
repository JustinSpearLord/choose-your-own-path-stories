import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync } from 'fflate';
import { beforeEach, describe, expect, it } from 'vitest';
import { choose, setPassageNote } from '../../src/engine/run';
import { checkStoryBytes } from '../../src/format/parse';
import { buildBackupBytes, restoreBackup } from '../../src/storage/backup';
import { db, QuestDb, setDatabase } from '../../src/storage/db';
import {
  currentRun,
  deleteStory,
  getImages,
  getLook,
  getRun,
  listRuns,
  listStories,
  rewindRun,
  saveLook,
  saveRun,
  saveStory,
  startNewRun,
  totals,
} from '../../src/storage/repo';

const ROOT = join(__dirname, '..', '..');
const load = (file: string) => checkStoryBytes(new Uint8Array(readFileSync(join(ROOT, file))));
let n = 0;

async function add(file: string) {
  const f = load(file);
  await saveStory({ story: f.story!, isPackage: f.isPackage, sizeBytes: f.sizeBytes, images: f.images, imageMeta: f.imageMeta });
  return f.story!;
}

beforeEach(() => {
  setDatabase(new QuestDb(`test-${++n}`));
});

describe('library storage', () => {
  it('stores stories with their images, and removes them with everything attached', async () => {
    const story = await add('samples/lantern_road.quest.zip');
    await add('samples/the_well.quest.json');
    expect((await listStories()).map((s) => s.id).sort()).toEqual(['lantern-road', 'the-well']);
    const images = await getImages('lantern-road');
    expect(images).toHaveLength(7);
    expect(images.find((i) => i.path === 'images/ferry.png')).toMatchObject({ width: 320, height: 180, type: 'image/png' });

    await saveLook(story.id, { mode: 'tide', font: 'sans' });
    await startNewRun(story);
    await deleteStory(story.id);
    expect(await getImages('lantern-road')).toEqual([]);
    expect(await getLook('lantern-road')).toBeNull();
    expect(await listRuns('lantern-road')).toEqual([]);
    expect(await listStories()).toHaveLength(1);
  });

  it('keeps exactly one current run per story, and rewinding leaves the old run unchanged', async () => {
    const story = await add('samples/lantern_road.quest.json');
    let first = await startNewRun(story);
    expect(first.name).toBe('The Lantern Road run 1');
    first = choose(choose(first, story, 0), story, 0);
    first = setPassageNote(first, 1, 0, 'ash on the floor');
    await saveRun(first);
    const stored = await getRun(first.runId);

    const second = await rewindRun(first, 1, story);
    expect(second.name).toBe('The Lantern Road run 2');
    expect((await currentRun(story.id))!.runId).toBe(second.runId);
    const after = await getRun(first.runId);
    expect({ ...after, isCurrent: true }).toEqual(stored);
    expect(after!.isCurrent).toBe(false);
    expect(second.steps).toHaveLength(2);
    expect(second.steps[1].notes[0].text).toBe('ash on the floor');

    const third = await startNewRun(story);
    const runs = await listRuns(story.id);
    expect(runs.filter((r) => r.isCurrent).map((r) => r.runId)).toEqual([third.runId]);
    expect((await totals()).paths).toBe(3);
    expect((await totals()).notes).toBe(2);
  });
});

describe('backup and restore', () => {
  async function seed() {
    const story = await add('samples/lantern_road.quest.zip');
    const well = await add('samples/the_well.quest.json');
    await saveLook(story.id, { mode: 'custom', colors: { background: '#101010', panel: '#202020', text: '#FAFAFA', accent: '#FF8800' } });
    let run = await startNewRun(story);
    run = setPassageNote(choose(run, story, 0), 1, 0, 'a note');
    await saveRun(run);
    let done = await startNewRun(well);
    done = choose(done, well, 1);
    await saveRun(done);
    return { story, well, run, done };
  }

  it('writes backup.json plus each story and its images', async () => {
    await seed();
    const files = unzipSync(await buildBackupBytes());
    const names = Object.keys(files);
    expect(names).toContain('backup.json');
    expect(names).toContain('stories/lantern-road/story.json');
    expect(names).toContain('stories/the-well/story.json');
    expect(names).toContain('stories/lantern-road/images/portraits/wren.png');
    const manifest = JSON.parse(new TextDecoder().decode(files['backup.json']));
    expect(manifest.format).toBe('quest-backup/1');
    expect(manifest.stories).toHaveLength(2);
    expect(manifest.runs).toHaveLength(2);
    expect(manifest.looks).toHaveLength(1);
    expect(manifest.endings).toEqual([expect.objectContaining({ storyId: 'the-well', scene: 'end-home' })]);
  });

  it('restores stories, runs, notes and looks into an empty device', async () => {
    const { run, done } = await seed();
    const bytes = await buildBackupBytes();
    setDatabase(new QuestDb(`test-${++n}`));
    expect(await listStories()).toEqual([]);

    const summary = await restoreBackup(bytes);
    expect(summary).toMatchObject({ storiesAdded: 2, runsAdded: 2, looksAdded: 1, storiesSkipped: 0 });
    expect(await listStories()).toHaveLength(2);
    expect(await getImages('lantern-road')).toHaveLength(7);
    expect((await getLook('lantern-road'))!.mode).toBe('custom');
    expect(await getRun(run.runId)).toEqual(run);
    expect(await getRun(done.runId)).toEqual(done);
    expect((await totals()).notes).toBe(1);
  });

  it('only adds: device looks win, runs merge by id, the newer story version is kept', async () => {
    const { story, run } = await seed();
    const bytes = await buildBackupBytes();

    // The device moves on after the backup: a different look, a newer story, one more run.
    await saveLook(story.id, { mode: 'moss' });
    const newer = { ...story, version: '9.0' };
    await saveStory({ story: newer, isPackage: true, sizeBytes: 1, images: new Map(), imageMeta: new Map() });
    const extra = await startNewRun(newer);
    await db.runs.delete(run.runId);

    const summary = await restoreBackup(bytes);
    expect(summary).toMatchObject({ storiesAdded: 0, storiesKept: 2, runsAdded: 1, looksAdded: 0 });
    expect((await getLook(story.id))!.mode).toBe('moss');
    expect((await listStories()).find((s) => s.id === story.id)!.version).toBe('9.0');
    const runs = await listRuns(story.id);
    expect(runs.map((r) => r.runId).sort()).toEqual([extra.runId, run.runId].sort());
    expect(runs.filter((r) => r.isCurrent)).toHaveLength(1);
  });

  it('rejects files that are not backups', async () => {
    await expect(restoreBackup(new TextEncoder().encode('hello'))).rejects.toThrow(/not a backup/);
    const zip = new Uint8Array(readFileSync(join(ROOT, 'samples/lantern_road.quest.zip')));
    await expect(restoreBackup(zip)).rejects.toThrow(/backup\.json/);
  });
});

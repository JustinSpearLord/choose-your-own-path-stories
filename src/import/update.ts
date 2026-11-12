// New version: compare an incoming story file with the installed one and plan what happens to play.
import { countMovedNotes, currentStep, migrateNotes, snapshotScene } from '../engine/run';
import type { Run } from '../engine/types';
import { authorTheme, describeLook } from '../format/theme';
import type { PlayerLook, Story } from '../format/types';

/** Compares versions numerically by dot-separated parts: 1.10 > 1.9. A missing version counts as 0. */
export function compareVersions(a: string | undefined, b: string | undefined): number {
  const parts = (v: string | undefined) =>
    (v ?? '').split('.').map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function versionLabel(version: string | undefined): string {
  return version ? `v${version}` : 'no version';
}

type Images = ReadonlyMap<string, Uint8Array>;

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function sameContent(a: Story, aImages: Images, b: Story, bImages: Images): boolean {
  if (JSON.stringify(a) !== JSON.stringify(b)) return false;
  if (aImages.size !== bImages.size) return false;
  for (const [path, data] of aImages) {
    const other = bImages.get(path);
    if (!other || !sameBytes(data, other)) return false;
  }
  return true;
}

export interface UpdateEffect {
  tone: 'ok' | 'note';
  title: string;
  text: string;
}

export interface UpdatePlan {
  /** Same version and same content: there is nothing to update. */
  identical: boolean;
  direction: 'newer' | 'older' | 'same';
  oldVersion: string;
  newVersion: string;
  oldScenes: number;
  newScenes: number;
  effects: UpdateEffect[];
}

export function planUpdate(
  installed: { story: Story; images: Images },
  incoming: { story: Story; images: Images },
  runs: Run[],
  look: PlayerLook | null,
): UpdatePlan {
  const cmp = compareVersions(incoming.story.version, installed.story.version);
  const identical = cmp === 0 && sameContent(installed.story, installed.images, incoming.story, incoming.images);
  const newLabel = versionLabel(incoming.story.version);
  const oldLabel = versionLabel(installed.story.version);
  const effects: UpdateEffect[] = [];

  const active = runs.find((r) => r.isCurrent && r.status === 'active');
  if (active) {
    const step = currentStep(active);
    const n = active.steps.length;
    if (incoming.story.scenes[step.sceneId]) {
      effects.push({
        tone: 'ok',
        title: `You continue at Scene ${n} · ${step.snapshot.title}.`,
        text: `It still exists in ${newLabel}, so you pick up where you stopped.`,
      });
      const previousArt = n > 1 ? active.steps[n - 2].snapshot.art : undefined;
      const moved = countMovedNotes(step.notes, step.snapshot, snapshotScene(incoming.story, step.sceneId, previousArt));
      if (moved > 0) {
        effects.push({
          tone: 'note',
          title: `${moved} ${moved === 1 ? 'note' : 'notes'} may have moved.`,
          text: `“${step.snapshot.title}” was rewritten, so ${moved === 1 ? 'its note is' : 'those notes are'} kept on the scene instead of a passage.`,
        });
      }
    } else {
      effects.push({
        tone: 'note',
        title: 'You start over.',
        text: `“${step.snapshot.title}”, where you stopped, is gone from ${newLabel}. Your run so far is kept as a saved path.`,
      });
    }
  } else {
    effects.push({
      tone: 'ok',
      title: 'Nothing in progress.',
      text: `Your next play starts from the beginning of ${newLabel}.`,
    });
  }

  const saved = runs.filter((r) => r !== active).length;
  if (saved > 0) {
    effects.push({
      tone: 'ok',
      title: `Your ${saved} saved ${saved === 1 ? 'path stays' : 'paths stay'} readable.`,
      text: `${saved === 1 ? 'It keeps' : 'They keep'} the text you played, marked “${oldLabel}” in Review.`,
    });
  }

  const lookName = describeLook(installed.story.theme, look);
  const themeChanged =
    JSON.stringify(authorTheme(installed.story.theme)) !== JSON.stringify(authorTheme(incoming.story.theme));
  if (!look || look.mode === 'author') {
    effects.push(
      themeChanged
        ? {
            tone: 'note',
            title: 'The look changes with the story.',
            text: `You use the author’s look, and it is now ${describeLook(incoming.story.theme, look)}.`,
          }
        : { tone: 'ok', title: `Your look stays ${lookName}.`, text: 'The author’s theme didn’t change.' },
    );
  } else {
    effects.push({ tone: 'ok', title: `Your look stays ${lookName}.`, text: 'You picked it yourself, so it is kept.' });
  }

  return {
    identical,
    direction: cmp > 0 ? 'newer' : cmp < 0 ? 'older' : 'same',
    oldVersion: installed.story.version ?? '',
    newVersion: incoming.story.version ?? '',
    oldScenes: Object.keys(installed.story.scenes).length,
    newScenes: Object.keys(incoming.story.scenes).length,
    effects,
  };
}

/**
 * Re-reads the scene a run is waiting in from `story`, carrying its notes over.
 * Returns null when that scene no longer exists.
 */
export function refreshCurrentStep(run: Run, story: Story): Run | null {
  const index = run.steps.length - 1;
  const step = run.steps[index];
  if (!story.scenes[step.sceneId]) return null;
  const previousArt = index > 0 ? run.steps[index - 1].snapshot.art : undefined;
  const fresh = snapshotScene(story, step.sceneId, previousArt);
  const steps = run.steps.slice();
  steps[index] = { ...step, snapshot: fresh, notes: migrateNotes(step.notes, step.snapshot, fresh) };
  return { ...run, steps, storyVersion: story.version ?? '' };
}

/**
 * What an update does to runs. Unfinished runs continue in the new version when their scene still
 * exists, otherwise they are marked `left`. Finished runs are never touched: they keep their snapshots.
 * Returns only the runs that changed.
 */
export function applyUpdateToRuns(runs: Run[], story: Story, now: string = new Date().toISOString()): Run[] {
  const changed: Run[] = [];
  for (const run of runs) {
    if (run.status !== 'active') continue;
    const refreshed = refreshCurrentStep(run, story);
    if (refreshed) {
      if (JSON.stringify(refreshed) !== JSON.stringify(run)) changed.push({ ...refreshed, updatedAt: now });
    } else {
      changed.push({ ...run, status: 'left', isCurrent: false, updatedAt: now });
    }
  }
  return changed;
}

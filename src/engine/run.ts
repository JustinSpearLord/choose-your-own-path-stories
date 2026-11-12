// Runs: start, choose, notes, rewind, finish. Pure functions: every change returns a new run.
import { characterColor } from '../format/art';
import type { Story } from '../format/types';
import type { EndingFound, Note, Run, SceneSnapshot, Step } from './types';

export const DEFAULT_PROMPT = 'What do you do?';

const nowIso = () => new Date().toISOString();
const newId = () => globalThis.crypto.randomUUID();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Captures a scene as it is right now. `previousArt` supplies the art when the scene sets none. */
export function snapshotScene(story: Story, sceneId: string, previousArt?: string): SceneSnapshot {
  const scene = story.scenes[sceneId];
  if (!scene) throw new Error(`Scene "${sceneId}" is not in the story`);
  const speakers: SceneSnapshot['speakers'] = {};
  for (const p of scene.text) {
    if (typeof p === 'string' || speakers[p.speaker]) continue;
    const c = story.characters?.find((ch) => ch.id === p.speaker);
    speakers[p.speaker] = {
      name: c?.name ?? p.speaker,
      color: characterColor(p.speaker, c?.color),
      ...(c?.portrait ? { portrait: c.portrait } : {}),
    };
  }
  return {
    title: scene.title ?? sceneId,
    art: scene.art ?? previousArt ?? 'default',
    passages: clone(scene.text),
    prompt: scene.prompt ?? DEFAULT_PROMPT,
    choices: (scene.choices ?? []).map((c) => ({ text: c.text, to: c.to })),
    ...(scene.ending ? { ending: { title: scene.ending.title, tone: scene.ending.tone ?? 'neutral' } } : {}),
    speakers,
  };
}

function enter(story: Story, sceneId: string, at: string, previousArt?: string): Step {
  return { sceneId, snapshot: snapshotScene(story, sceneId, previousArt), notes: [], skipped: [], enteredAt: at };
}

export interface StartOptions {
  runId?: string;
  now?: string;
  name?: string;
}

/** A new run at the story's start scene. */
export function startRun(story: Story, opts: StartOptions = {}): Run {
  const now = opts.now ?? nowIso();
  const first = enter(story, story.start, now);
  const ended = !!first.snapshot.ending;
  return {
    runId: opts.runId ?? newId(),
    storyId: story.id,
    storyVersion: story.version ?? '',
    name: opts.name ?? `${story.title} run 1`,
    status: ended ? 'finished' : 'active',
    isCurrent: true,
    startedAt: now,
    updatedAt: now,
    ...(ended ? { finishedAt: now, endingSceneId: story.start } : {}),
    playedMs: 0,
    steps: [first],
  };
}

export function currentStep(run: Run): Step {
  return run.steps[run.steps.length - 1];
}

/** True when the run is waiting for a decision at its last step. */
export function canChoose(run: Run): boolean {
  const step = currentStep(run);
  return run.status === 'active' && !step.choice && step.snapshot.choices.length > 0;
}

/**
 * Records the choice at the current step (with the choices skipped and an optional decision note)
 * and moves to the next scene. Reaching an ending finishes the run.
 */
export function choose(run: Run, story: Story, index: number, opts: { now?: string; note?: string } = {}): Run {
  if (!canChoose(run)) throw new Error('This run is not waiting for a decision');
  const now = opts.now ?? nowIso();
  const next = clone(run);
  const step = currentStep(next);
  const picked = step.snapshot.choices[index];
  if (!picked) throw new Error(`There is no choice ${index} here`);
  if (!story.scenes[picked.to]) throw new Error(`Scene "${picked.to}" is not in the story`);

  step.choice = { index, text: picked.text, to: picked.to };
  step.skipped = step.snapshot.choices.filter((_, i) => i !== index).map((c) => c.text);
  const note = (opts.note ?? step.choiceNote ?? '').trim();
  if (note) step.choiceNote = note;
  else delete step.choiceNote;

  const entered = enter(story, picked.to, now, step.snapshot.art);
  next.steps.push(entered);
  next.updatedAt = now;
  if (entered.snapshot.ending) {
    next.status = 'finished';
    next.finishedAt = now;
    next.endingSceneId = picked.to;
  }
  return next;
}

/** Sets the note on one passage (or on the whole scene with `passage: null`). Empty text deletes it. */
export function setPassageNote(
  run: Run,
  stepIndex: number,
  passage: number | null,
  text: string,
  now: string = nowIso(),
): Run {
  const next = clone(run);
  const step = next.steps[stepIndex];
  if (!step) throw new Error(`There is no step ${stepIndex}`);
  const trimmed = text.trim();
  const notes = step.notes.filter((n) => n.passage !== passage);
  if (trimmed) notes.push({ passage, text: trimmed, at: now });
  step.notes = notes.sort((a, b) => (a.passage ?? -1) - (b.passage ?? -1));
  next.updatedAt = now;
  return next;
}

/** Sets the note on a step's decision. Empty text deletes it. */
export function setChoiceNote(run: Run, stepIndex: number, text: string, now: string = nowIso()): Run {
  const next = clone(run);
  const step = next.steps[stepIndex];
  if (!step) throw new Error(`There is no step ${stepIndex}`);
  const trimmed = text.trim();
  if (trimmed) step.choiceNote = trimmed;
  else delete step.choiceNote;
  next.updatedAt = now;
  return next;
}

export function renameRun(run: Run, name: string, now: string = nowIso()): Run {
  const trimmed = name.trim();
  return trimmed ? { ...clone(run), name: trimmed, updatedAt: now } : run;
}

export function addPlayTime(run: Run, ms: number): Run {
  return ms > 0 ? { ...run, playedMs: (run.playedMs ?? 0) + Math.round(ms) } : run;
}

export interface RewindOptions {
  runId?: string;
  now?: string;
  name?: string;
  /** The story as installed now. When given, the decision is re-read from it if the scene still exists. */
  story?: Story;
}

/**
 * Goes back to the decision at `stepIndex`: a NEW run with steps 0..stepIndex copied (notes included)
 * and that step's choice cleared. The original run is not touched.
 */
export function rewind(run: Run, stepIndex: number, opts: RewindOptions = {}): Run {
  const from = run.steps[stepIndex];
  if (!from) throw new Error(`There is no step ${stepIndex}`);
  if (from.snapshot.choices.length === 0) throw new Error('That step has no decision to rewind to');
  const now = opts.now ?? nowIso();
  const steps = clone(run.steps.slice(0, stepIndex + 1));
  const last = steps[steps.length - 1];
  delete last.choice;
  delete last.choiceNote;
  last.skipped = [];
  if (opts.story?.scenes[last.sceneId]) {
    const previousArt = steps.length > 1 ? steps[steps.length - 2].snapshot.art : undefined;
    const fresh = snapshotScene(opts.story, last.sceneId, previousArt);
    last.notes = migrateNotes(last.notes, last.snapshot, fresh);
    last.snapshot = fresh;
  }
  return {
    runId: opts.runId ?? newId(),
    storyId: run.storyId,
    storyVersion: opts.story?.version ?? run.storyVersion,
    name: opts.name ?? `${run.name} (rewind)`,
    status: 'active',
    isCurrent: true,
    startedAt: now,
    updatedAt: now,
    parentRunId: run.runId,
    playedMs: 0,
    steps,
  };
}

function passageKey(p: SceneSnapshot['passages'][number] | undefined): string {
  if (p === undefined) return '\u0000missing';
  return typeof p === 'string' ? `n:${p}` : `d:${p.speaker}:${p.line}`;
}

/**
 * Carries notes over to a rewritten scene. A note stays on its passage when that passage is unchanged;
 * otherwise it moves to the scene (`passage: null`). Several moved notes are joined into one scene note.
 */
export function migrateNotes(notes: Note[], before: SceneSnapshot, after: SceneSnapshot): Note[] {
  const kept: Note[] = [];
  const moved: Note[] = [];
  for (const note of notes) {
    if (note.passage === null) moved.push(note);
    else if (passageKey(before.passages[note.passage]) === passageKey(after.passages[note.passage])) kept.push(note);
    else moved.push(note);
  }
  if (moved.length) {
    kept.unshift({
      passage: null,
      text: moved.map((n) => n.text).join('\n'),
      at: moved[moved.length - 1].at,
    });
  }
  return kept;
}

/** How many passage notes would move to the scene if `after` replaced `before`. */
export function countMovedNotes(notes: Note[], before: SceneSnapshot, after: SceneSnapshot): number {
  return notes.filter(
    (n) => n.passage !== null && passageKey(before.passages[n.passage]) !== passageKey(after.passages[n.passage]),
  ).length;
}

export function noteCount(run: Run): number {
  return run.steps.reduce((n, s) => n + s.notes.length + (s.choiceNote ? 1 : 0), 0);
}

export function choiceCount(run: Run): number {
  return run.steps.filter((s) => s.choice).length;
}

export interface RunStats {
  scenes: number;
  choices: number;
  notes: number;
  playedMs: number;
}

export function runStats(run: Run): RunStats {
  return { scenes: run.steps.length, choices: choiceCount(run), notes: noteCount(run), playedMs: run.playedMs ?? 0 };
}

/** "41m", "1h 05m", or "under 1m". */
export function formatPlayed(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** Ending scenes reached by any finished run, with the first date each was found. */
export function endingsFound(runs: Run[]): EndingFound[] {
  const found = new Map<string, EndingFound>();
  for (const run of runs) {
    if (run.status !== 'finished' || !run.endingSceneId || !run.finishedAt) continue;
    const last = currentStep(run);
    const existing = found.get(run.endingSceneId);
    if (existing && existing.foundAt <= run.finishedAt) continue;
    found.set(run.endingSceneId, {
      sceneId: run.endingSceneId,
      title: last.snapshot.ending?.title ?? last.snapshot.title,
      tone: last.snapshot.ending?.tone ?? 'neutral',
      foundAt: run.finishedAt,
      runId: run.runId,
      choices: choiceCount(run),
    });
  }
  return [...found.values()].sort((a, b) => a.foundAt.localeCompare(b.foundAt));
}

/** The ids of every ending scene in the story. */
export function endingIds(story: Story): string[] {
  return Object.keys(story.scenes).filter((id) => story.scenes[id].ending);
}

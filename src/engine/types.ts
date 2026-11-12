import type { Choice, Passage, Tone } from '../format/types';

/** A scene exactly as it was played, so saved paths stay readable after the story is updated. */
export interface SceneSnapshot {
  title: string;
  /** Built-in art name or bundled image path, with "previous scene's art" already applied. */
  art: string;
  passages: Passage[];
  prompt: string;
  choices: Choice[];
  ending?: { title: string; tone: Tone };
  /** The speakers in this scene, by character id. */
  speakers: Record<string, { name: string; color: string; portrait?: string }>;
}

export interface Note {
  /** Position in the scene's text, or null for a note on the whole scene. */
  passage: number | null;
  text: string;
  at: string;
}

export interface Step {
  sceneId: string;
  snapshot: SceneSnapshot;
  notes: Note[];
  choice?: { index: number; text: string; to: string };
  skipped: string[];
  choiceNote?: string;
  enteredAt: string;
}

export type RunStatus = 'active' | 'finished' | 'left';

/** One playthrough of a story. */
export interface Run {
  runId: string;
  storyId: string;
  storyVersion: string;
  name: string;
  status: RunStatus;
  isCurrent: boolean;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  endingSceneId?: string;
  parentRunId?: string;
  /** Time spent on the play screens, in milliseconds. */
  playedMs: number;
  steps: Step[];
}

export interface EndingFound {
  sceneId: string;
  title: string;
  tone: Tone;
  /** When it was first reached, and by which run. */
  foundAt: string;
  runId: string;
  choices: number;
}

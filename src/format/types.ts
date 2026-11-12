// Types for the quest/1 story format and the quest-path/1 export. See docs/story-format.md.

export type Dialogue = { speaker: string; line: string };
export type Passage = string | Dialogue;

export interface Choice {
  text: string;
  to: string;
}

export type Tone = 'good' | 'bad' | 'neutral';

export interface Ending {
  title: string;
  tone?: Tone;
}

export interface Scene {
  title?: string;
  art?: string;
  text: Passage[];
  prompt?: string;
  choices?: Choice[];
  ending?: Ending;
}

export interface Character {
  id: string;
  name: string;
  color?: string;
  portrait?: string;
  about?: string;
}

export type PresetName = 'dusk' | 'tide' | 'ember' | 'moss' | 'parchment' | 'frost';
export type FontName = 'serif' | 'sans' | 'pixel';
export type ColorRole = 'background' | 'panel' | 'text' | 'accent';
export type ThemeColors = Record<ColorRole, string>;

export interface StoryTheme {
  preset?: string;
  colors?: Partial<Record<string, unknown>>;
  font?: string;
}

export interface Story {
  format: 'quest/1';
  id: string;
  title: string;
  author: string;
  version?: string;
  summary?: string;
  cover?: string;
  theme?: StoryTheme;
  imageStyle?: 'pixel' | 'smooth';
  start: string;
  characters?: Character[];
  scenes: Record<string, Scene>;
}

/** The player's chosen look for one story, saved per story id. */
export interface PlayerLook {
  mode: 'author' | PresetName | 'custom';
  colors?: ThemeColors;
  /** Unset means "use the author's font". */
  font?: FontName;
}

export interface Issue {
  message: string;
  /** The scene to fix, when the problem belongs to one. */
  scene?: string;
}

export interface StoryStats {
  scenes: number;
  endings: number;
  decisions: number;
  images: number;
}

export interface ImageMeta {
  size: number;
  /** False when the bytes are not a PNG or WebP the app can read. */
  readable: boolean;
  width?: number;
  height?: number;
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  stats: StoryStats;
}

// ---- quest-path/1 ----

export interface PathNote {
  passage: number | null;
  text: string;
}

export interface PathStep {
  scene: string;
  notes: PathNote[];
  choice?: { index: number; text: string; to: string };
  skipped?: string[];
  choiceNote?: string;
}

export interface PathFile {
  format: 'quest-path/1';
  story: { id: string; title: string; version?: string };
  name: string;
  started: string;
  finished?: string;
  ending?: { scene: string; title: string };
  steps: PathStep[];
}

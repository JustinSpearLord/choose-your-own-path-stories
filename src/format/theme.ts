// Story themes: presets, WCAG contrast, and resolving the look a story is actually shown in.
import type { ColorRole, FontName, PlayerLook, PresetName, StoryTheme, ThemeColors } from './types';

export const PRESETS: Record<PresetName, ThemeColors> = {
  dusk: { background: '#15131C', panel: '#201D29', text: '#EDE8F5', accent: '#E8B44C' },
  tide: { background: '#0F1E24', panel: '#17303A', text: '#E3F1F0', accent: '#5CC8B4' },
  ember: { background: '#1E1110', panel: '#2E1A17', text: '#F5E6DC', accent: '#E2725B' },
  moss: { background: '#141A12', panel: '#1F2A1C', text: '#E6EEDC', accent: '#A8C66C' },
  parchment: { background: '#F2E8D5', panel: '#E6D8BC', text: '#2B2118', accent: '#8A4B2A' },
  frost: { background: '#EEF2F6', panel: '#DCE4EC', text: '#1B2430', accent: '#3D6FB0' },
};

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

export const PRESET_INFO: Record<PresetName, { name: string; tone: string }> = {
  dusk: { name: 'Dusk', tone: 'Quiet, eerie' },
  tide: { name: 'Tide', tone: 'Cold, watery' },
  ember: { name: 'Ember', tone: 'Tense, violent' },
  moss: { name: 'Moss', tone: 'Old, wild' },
  parchment: { name: 'Parchment', tone: 'Warm, storybook' },
  frost: { name: 'Frost', tone: 'Clear, bright' },
};

export const COLOR_ROLES: ColorRole[] = ['background', 'panel', 'text', 'accent'];
export const FONT_NAMES: FontName[] = ['serif', 'sans', 'pixel'];
export const FONT_LABELS: Record<FontName, string> = { serif: 'Book', sans: 'Clean', pixel: 'Pixel' };
export const FONT_STACKS: Record<FontName, string> = {
  serif: "'Literata', Georgia, serif",
  sans: "'IBM Plex Sans', system-ui, sans-serif",
  pixel: "'Pixelify Sans', ui-monospace, monospace",
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const DARK = '#15131C';
const WHITE = '#FFFFFF';

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function isPresetName(value: unknown): value is PresetName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, value);
}

export function isFontName(value: unknown): value is FontName {
  return value === 'serif' || value === 'sans' || value === 'pixel';
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex(rgb: number[]): string {
  return (
    '#' +
    rgb
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function luminance(hex: string): number {
  const c = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two #RRGGBB colors, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Mixes `a` toward `b`; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex(ca.map((v, i) => v + (cb[i] - v) * t));
}

/**
 * Returns `fg`, shifted toward white or black only as far as needed to reach `min` contrast on `bg`.
 */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrast(fg, bg) >= min) return fg.toUpperCase();
  const target = contrast(WHITE, bg) >= contrast('#000000', bg) ? WHITE : '#000000';
  for (let step = 1; step <= 40; step++) {
    const candidate = mix(fg, target, step / 40);
    if (contrast(candidate, bg) >= min) return candidate;
  }
  return target;
}

/** Text drawn on the accent: dark or white, whichever reads better. */
export function onAccent(accent: string): string {
  return contrast(DARK, accent) >= contrast(WHITE, accent) ? DARK : WHITE;
}

export interface AuthorTheme {
  preset: PresetName;
  colors: ThemeColors;
  font: FontName;
  /** True when the author overrode at least one preset color. */
  customized: boolean;
}

/** The author's theme with every fallback applied: bad values are ignored, never fatal. */
export function authorTheme(theme: StoryTheme | undefined | null): AuthorTheme {
  const t = theme && typeof theme === 'object' ? theme : {};
  const preset = isPresetName(t.preset) ? t.preset : 'dusk';
  const colors = { ...PRESETS[preset] };
  let customized = false;
  if (t.colors && typeof t.colors === 'object') {
    for (const role of COLOR_ROLES) {
      const value = (t.colors as Record<string, unknown>)[role];
      if (isHexColor(value) && value.toUpperCase() !== colors[role].toUpperCase()) {
        colors[role] = value.toUpperCase();
        customized = true;
      }
    }
  }
  return { preset, colors, font: isFontName(t.font) ? t.font : 'serif', customized };
}

/** The colors a look asks for, before any readability adjustment. */
export function lookColors(theme: StoryTheme | undefined | null, look: PlayerLook | undefined | null): ThemeColors {
  if (look?.mode === 'custom' && look.colors) return { ...look.colors };
  if (look && isPresetName(look.mode)) return { ...PRESETS[look.mode] };
  return authorTheme(theme).colors;
}

export interface ResolvedTheme {
  background: string;
  panel: string;
  /** Story text on the background, adjusted to at least 4.5:1. */
  text: string;
  /** Text on panels (choices, note boxes), adjusted to at least 4.5:1. */
  panelText: string;
  accent: string;
  /** The accent when used as text on the background, at least 4.5:1. */
  accentText: string;
  /** The accent when used as text on a panel, at least 4.5:1. */
  accentOnPanel: string;
  onAccent: string;
  accentShadow: string;
  accentTint: string;
  /** Meta text on the background and on panels, each at least 4.5:1. */
  muted: string;
  panelMuted: string;
  text2: string;
  border: string;
  borderStrong: string;
  panel2: string;
  font: FontName;
  fontStack: string;
  /** Contrast of the requested text and accent colors against the background. */
  textRatio: number;
  accentRatio: number;
  /** True when the text color had to be shifted to stay readable. */
  textAdjusted: boolean;
  /** True when the background is dark. */
  dark: boolean;
}

export function resolveTheme(theme: StoryTheme | undefined | null, look?: PlayerLook | null): ResolvedTheme {
  const author = authorTheme(theme);
  const wanted = lookColors(theme, look);
  const font = look?.font && isFontName(look.font) ? look.font : author.font;
  const { background, panel, accent } = wanted;
  const text = ensureContrast(wanted.text, background);
  const panelText = ensureContrast(text, panel);
  const dark = luminance(background) < 0.4;
  const far = dark ? WHITE : '#000000';
  return {
    background,
    panel,
    text,
    panelText,
    accent,
    accentText: ensureContrast(accent, background),
    accentOnPanel: ensureContrast(accent, panel),
    onAccent: onAccent(accent),
    accentShadow: mix(accent, '#000000', 0.42),
    accentTint: mix(panel, accent, 0.14),
    muted: ensureContrast(mix(text, background, 0.32), background),
    panelMuted: ensureContrast(mix(panelText, panel, 0.32), panel),
    text2: ensureContrast(mix(text, background, 0.14), background),
    border: mix(panel, far, 0.1),
    borderStrong: mix(panel, far, 0.2),
    panel2: mix(panel, background, 0.4),
    font,
    fontStack: FONT_STACKS[font],
    textRatio: contrast(wanted.text, background),
    accentRatio: contrast(accent, background),
    textAdjusted: text.toUpperCase() !== wanted.text.toUpperCase(),
    dark,
  };
}

/** A short label for a look, e.g. "Tide (author's)" or "Custom". */
export function describeLook(theme: StoryTheme | undefined | null, look: PlayerLook | undefined | null): string {
  if (!look || look.mode === 'author') {
    const a = authorTheme(theme);
    return `${PRESET_INFO[a.preset].name}${a.customized ? ', customized' : ''} (author’s)`;
  }
  if (look.mode === 'custom') return 'Custom';
  return PRESET_INFO[look.mode].name;
}

/** A readable color for a speaker's name on the given background. */
export function nameColor(color: string, background: string): string {
  return ensureContrast(color, background, 4.5);
}

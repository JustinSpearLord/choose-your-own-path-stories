import { describe, expect, it } from 'vitest';
import {
  authorTheme,
  contrast,
  describeLook,
  ensureContrast,
  onAccent,
  PRESET_NAMES,
  PRESETS,
  resolveTheme,
} from '../../src/format/theme';

describe('contrast', () => {
  it('matches the WCAG formula', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('every preset passes: text 13:1 or better, accent 4.6:1 or better', () => {
    for (const name of PRESET_NAMES) {
      const p = PRESETS[name];
      expect(contrast(p.text, p.background), name).toBeGreaterThanOrEqual(12.9);
      expect(contrast(p.accent, p.background), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('ensureContrast', () => {
  it('leaves a readable color alone', () => {
    expect(ensureContrast('#EDE8F5', '#15131C')).toBe('#EDE8F5');
  });

  it('shifts toward white on dark and toward black on light until 4.5:1', () => {
    const onDark = ensureContrast('#333333', '#15131C');
    expect(contrast(onDark, '#15131C')).toBeGreaterThanOrEqual(4.5);
    const onLight = ensureContrast('#DDDDDD', '#F2E8D5');
    expect(contrast(onLight, '#F2E8D5')).toBeGreaterThanOrEqual(4.5);
  });

  it('reaches 4.5:1 on any background', () => {
    for (const bg of ['#000000', '#FFFFFF', '#777777', '#808080', '#FF0000', '#00FF00', '#0000FF', '#767676']) {
      expect(contrast(ensureContrast(bg, bg), bg), bg).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('resolveTheme', () => {
  it('defaults to dusk with book text', () => {
    const t = resolveTheme(undefined);
    expect(t.background).toBe('#15131C');
    expect(t.accent).toBe('#E8B44C');
    expect(t.font).toBe('serif');
    expect(t.textAdjusted).toBe(false);
  });

  it('applies the author preset and color overrides, ignoring bad values', () => {
    const a = authorTheme({ preset: 'tide', colors: { accent: '#6FD6C2', text: 'blue', glow: '#FFFFFF' }, font: 'comic' });
    expect(a.preset).toBe('tide');
    expect(a.colors.accent).toBe('#6FD6C2');
    expect(a.colors.text).toBe(PRESETS.tide.text);
    expect(a.font).toBe('serif');
    expect(authorTheme({ preset: 'sunset' }).preset).toBe('dusk');
  });

  it('the player look wins over the author theme', () => {
    expect(resolveTheme({ preset: 'tide' }, { mode: 'ember' }).background).toBe(PRESETS.ember.background);
    expect(resolveTheme({ preset: 'tide' }, { mode: 'author' }).background).toBe(PRESETS.tide.background);
    const custom = { background: '#101010', panel: '#202020', text: '#FAFAFA', accent: '#FF8800' };
    const t = resolveTheme({ preset: 'tide', font: 'pixel' }, { mode: 'custom', colors: custom, font: 'sans' });
    expect(t.background).toBe('#101010');
    expect(t.font).toBe('sans');
    expect(resolveTheme({ font: 'pixel' }, { mode: 'author' }).font).toBe('pixel');
  });

  it('keeps text readable in a bad custom theme and says so', () => {
    const t = resolveTheme(undefined, {
      mode: 'custom',
      colors: { background: '#202020', panel: '#EEEEEE', text: '#2A2A2A', accent: '#222222' },
    });
    expect(t.textAdjusted).toBe(true);
    expect(t.textRatio).toBeLessThan(4.5);
    expect(contrast(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.panelText, t.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.accentText, t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.panelMuted, t.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.accentOnPanel, t.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.onAccent, t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('every preset resolves with readable derived colors', () => {
    for (const name of PRESET_NAMES) {
      const t = resolveTheme({ preset: name });
      expect(contrast(t.muted, t.background), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.panelMuted, t.panel), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.panelText, t.panel), name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.onAccent, t.accent), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('picks dark or white text for the accent', () => {
    expect(onAccent('#E8B44C')).toBe('#15131C');
    expect(onAccent('#3D2A8A')).toBe('#FFFFFF');
  });

  it('describes looks', () => {
    expect(describeLook({ preset: 'tide' }, null)).toBe('Tide (author’s)');
    expect(describeLook({ preset: 'tide' }, { mode: 'moss' })).toBe('Moss');
    expect(describeLook(undefined, { mode: 'custom' })).toBe('Custom');
  });
});

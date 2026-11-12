import type { CSSProperties, ReactNode } from 'react';
import type { ResolvedTheme } from '../../format/theme';

/** Maps a resolved story look onto the same CSS variables the app theme uses. */
export function themeVars(t: ResolvedTheme): CSSProperties {
  return {
    '--bg': t.background,
    '--panel': t.panel,
    '--panel-2': t.panel2,
    '--border': t.border,
    '--border-strong': t.borderStrong,
    '--text': t.text,
    '--text-2': t.text2,
    '--panel-text': t.panelText,
    '--panel-text-2': t.panelText,
    '--muted': t.muted,
    '--panel-muted': t.panelMuted,
    '--accent': t.accent,
    '--accent-text': t.accentText,
    '--accent-on-panel': t.accentOnPanel,
    '--accent-shadow': t.accentShadow,
    '--accent-tint': t.accentTint,
    '--on-accent': t.onAccent,
    '--handle': t.borderStrong,
    '--font-story': t.fontStack,
    colorScheme: t.dark ? 'dark' : 'light',
  } as CSSProperties;
}

/** Wraps a story screen so everything inside uses the story's look. */
export function StoryThemed({ theme, children }: { theme: ResolvedTheme; children: ReactNode }) {
  return (
    <div style={{ ...themeVars(theme), color: 'var(--text)' }} data-story-theme={theme.background}>
      {children}
    </div>
  );
}

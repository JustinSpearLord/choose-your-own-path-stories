import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArtView } from '../../../art/ArtView';
import { forgetStoryImages, type ImageSource } from '../../../art/images';
import { characterColor, storyCover } from '../../../format/art';
import {
  authorTheme,
  COLOR_ROLES,
  FONT_LABELS,
  FONT_NAMES,
  FONT_STACKS,
  lookColors,
  nameColor,
  PRESET_INFO,
  PRESET_NAMES,
  PRESETS,
  resolveTheme,
} from '../../../format/theme';
import type { ColorRole, PlayerLook, Story } from '../../../format/types';
import { setPending, usePending } from '../../../import/pending';
import { getLook, getStory, requestPersistence, saveLook, saveStory } from '../../../storage/repo';
import { Header } from '../../app-theme/Header';
import ui from '../../app-theme/ui.module.css';
import { useLoad, useTitle } from '../../hooks';
import { NotFound } from '../NotFound';
import css from './Look.module.css';

const ROLE_INFO: Record<ColorRole, { label: string; help: string }> = {
  background: { label: 'Background', help: 'Behind the story' },
  panel: { label: 'Panels', help: 'Choices, note boxes' },
  text: { label: 'Text', help: 'Story and choices' },
  accent: { label: 'Accent', help: 'Names, buttons, highlights' },
};

function StoryPreview({ story, look, source }: { story: Story; look: PlayerLook; source: ImageSource }) {
  const t = resolveTheme(story.theme, look);
  const scene = story.scenes[story.start];
  const narration = scene.text.find((p) => typeof p === 'string') as string | undefined;
  const dialogue = scene.text.find((p) => typeof p !== 'string') as { speaker: string; line: string } | undefined;
  const speaker = dialogue ? story.characters?.find((c) => c.id === dialogue.speaker) : undefined;
  const choices = (scene.choices ?? []).slice(0, 2);
  const para = { fontFamily: t.fontStack, color: t.text };
  return (
    <figure
      className={css.preview}
      aria-label="Preview of the story in this look"
      style={{ background: t.background, borderColor: t.panel }}
      data-testid="look-preview"
      data-bg={t.background}
      data-font={t.font}
    >
      <ArtView
        art={scene.art ?? storyCover(story)}
        source={source}
        pixel={story.imageStyle !== 'smooth'}
        className={css.previewArt}
      />
      <div className={css.previewBody}>
        {narration ? (
          <p className={css.previewText} style={para}>
            {narration.length > 150 ? `${narration.slice(0, 150).trimEnd()}…` : narration}
          </p>
        ) : null}
        {dialogue ? (
          <div className={css.previewLine}>
            <span
              className={css.previewSpeaker}
              style={{ color: nameColor(characterColor(dialogue.speaker, speaker?.color), t.background) }}
            >
              {(speaker?.name ?? dialogue.speaker).toUpperCase()}
            </span>
            <p className={css.previewText} style={para}>
              “{dialogue.line.length > 110 ? `${dialogue.line.slice(0, 110).trimEnd()}…` : dialogue.line}”
            </p>
          </div>
        ) : null}
        <div className={css.previewChoices}>
          {choices.map((c, i) => (
            <div
              key={i}
              className={css.previewChoice}
              style={{ background: t.panel, borderColor: i === 0 ? t.accent : t.panel, color: t.panelText }}
            >
              <span
                className={css.previewKey}
                style={
                  i === 0
                    ? { background: t.accent, color: t.onAccent }
                    : { background: t.background, color: t.text }
                }
              >
                {'ABC'[i]}
              </span>
              {c.text}
            </div>
          ))}
        </div>
        <div className={css.previewButton} style={{ background: t.accent, color: t.onAccent }}>
          Continue
        </div>
      </div>
    </figure>
  );
}

interface EditorProps {
  story: Story;
  source: ImageSource;
  initial: PlayerLook;
  heading: string;
  sub: string;
  backTo: string;
  backLabel: string;
  action: string;
  hint: string;
  onSave: (look: PlayerLook) => Promise<void>;
}

function LookEditor({ story, source, initial, heading, sub, backTo, backLabel, action, hint, onSave }: EditorProps) {
  const [look, setLook] = useState<PlayerLook>(initial);
  const [saving, setSaving] = useState(false);
  const author = authorTheme(story.theme);
  const colors = lookColors(story.theme, look);
  const t = resolveTheme(story.theme, look);
  const isAuthor = look.mode === 'author';
  const font = t.font;

  let check: { title: string; text: string; color: string };
  if (t.textRatio < 4.5) {
    check = {
      title: 'Hard to read.',
      text: `Text on background is ${t.textRatio.toFixed(1)}:1. The app adjusts the text color until it reaches 4.5:1.`,
      color: 'var(--danger-text)',
    };
  } else if (t.accentRatio < 3) {
    check = {
      title: 'Accent is faint.',
      text: `Names and highlights are ${t.accentRatio.toFixed(1)}:1 against the background. Try a brighter or darker accent.`,
      color: 'var(--accent-text)',
    };
  } else {
    check = {
      title: 'Easy to read.',
      text: `Text ${t.textRatio.toFixed(1)}:1, accent ${t.accentRatio.toFixed(1)}:1 against the background.`,
      color: 'var(--info)',
    };
  }

  const keepFont = look.font ? { font: look.font } : {};
  return (
    <main className={ui.page}>
      <Header title={heading} sub={sub} backTo={backTo} backLabel={backLabel} />

      <StoryPreview story={story} look={look} source={source} />

      <div className={css.authorRow} data-on={isAuthor}>
        <span className={css.dots} aria-hidden="true">
          {COLOR_ROLES.map((r) => (
            <span key={r} style={{ background: author.colors[r] }} />
          ))}
        </span>
        <span className={ui.rowText}>
          <span className={css.authorTitle}>
            Author’s look: {PRESET_INFO[author.preset].name}
            {author.customized ? ', customized' : ''}
          </span>
          <span className={ui.muted}>Set in the story file by {story.author}</span>
        </span>
        <button
          type="button"
          className={css.useBtn}
          aria-pressed={isAuthor}
          onClick={() => setLook({ mode: 'author' })}
        >
          {isAuthor ? 'In use' : 'Use it'}
        </button>
      </div>

      <section className={ui.section}>
        <h2 className={ui.sectionLabel}>Presets</h2>
        <div role="radiogroup" aria-label="Color presets" className={css.presets}>
          {PRESET_NAMES.map((name) => {
            const p = PRESETS[name];
            const on = look.mode === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={on}
                className={css.preset}
                style={{ background: p.background, color: p.text }}
                onClick={() => setLook({ mode: name, ...keepFont })}
              >
                <span className={css.swatches} aria-hidden="true">
                  <span style={{ background: p.panel }} />
                  <span style={{ background: p.text }} />
                  <span style={{ background: p.accent }} />
                </span>
                <span className={css.presetName}>{PRESET_INFO[name].name}</span>
                <span className={css.presetTone}>{PRESET_INFO[name].tone}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2 className={ui.sectionLabel}>Your colors</h2>
          <span className={ui.muted}>{look.mode === 'custom' ? 'Custom look' : 'Edit any color to customize'}</span>
        </div>
        {COLOR_ROLES.map((role) => (
          <label key={role} className={css.colorRow}>
            <span className={ui.rowText}>
              <span className={css.colorLabel}>{ROLE_INFO[role].label}</span>
              <span className={ui.muted}>{ROLE_INFO[role].help}</span>
            </span>
            <span className={css.hex}>{colors[role].toUpperCase()}</span>
            <input
              type="color"
              className={css.colorInput}
              value={colors[role].toLowerCase()}
              aria-label={`${ROLE_INFO[role].label} color`}
              onChange={(e) =>
                setLook({ mode: 'custom', colors: { ...colors, [role]: e.target.value.toUpperCase() }, ...keepFont })
              }
            />
          </label>
        ))}
      </section>

      <section className={ui.section}>
        <h2 className={ui.sectionLabel}>Story text</h2>
        <div role="radiogroup" aria-label="Story text style" className={ui.segmented}>
          {FONT_NAMES.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={font === f}
              className={ui.segment}
              style={{ fontFamily: FONT_STACKS[f], fontSize: 15, fontWeight: 400 }}
              onClick={() => setLook({ ...look, font: f })}
            >
              {FONT_LABELS[f]}
            </button>
          ))}
        </div>
      </section>

      <div className={ui.notice} role="status">
        <span className={ui.checkDot} style={{ background: check.color, marginTop: 5 }} aria-hidden="true" />
        <span>
          <strong style={{ color: check.color }}>{check.title}</strong> {check.text}
        </span>
      </div>

      <div className={ui.bottom}>
        <button
          type="button"
          className={ui.primary}
          disabled={saving}
          onClick={() => {
            setSaving(true);
            void onSave(look).finally(() => setSaving(false));
          }}
        >
          {action}
        </button>
        <span className={`${ui.muted} ${ui.center}`}>{hint}</span>
      </div>
    </main>
  );
}

/** Step 2 of importing: pick the look, then add the story to the library. */
export function ImportLook() {
  useTitle('Choose a look');
  const navigate = useNavigate();
  const pending = usePending();
  const story = pending?.file.story ?? null;
  const leaving = useRef(false);

  useEffect(() => {
    if (!story && !leaving.current) navigate('/import', { replace: true });
  }, [story, navigate]);
  if (!pending || !story) return null;

  return (
    <LookEditor
      story={story}
      source={{ images: pending.file.images }}
      initial={{ mode: 'author' }}
      heading="Choose a look"
      sub={`${story.title} · step 2 of 2`}
      backTo="/import"
      backLabel="Back to file check"
      action="Add to library with this look"
      hint="You can change it later from the story’s menu in the library."
      onSave={async (look) => {
        await saveStory({
          story,
          isPackage: pending.file.isPackage,
          sizeBytes: pending.file.sizeBytes,
          images: pending.file.images,
          imageMeta: pending.file.imageMeta,
          sourceUrl: pending.sourceUrl,
        });
        forgetStoryImages(story.id);
        await saveLook(story.id, look);
        void requestPersistence();
        leaving.current = true;
        navigate('/', { replace: true });
        setPending(null);
      }}
    />
  );
}

/** Change look, from the story menu. */
export function ChangeLook() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const loaded = useLoad(async () => ({ record: await getStory(id), look: await getLook(id) }), [id]);
  useTitle('Change look');
  if (loaded.loading) return null;
  const record = loaded.data?.record;
  if (!record) return <NotFound message="That story is not in your library." />;
  return (
    <LookEditor
      story={record.story}
      source={{ storyId: id }}
      initial={loaded.data?.look ?? { mode: 'author' }}
      heading="Change look"
      sub={record.title}
      backTo={`/story/${id}`}
      backLabel="Back to story menu"
      action="Save look"
      hint="Only this story changes. Your saved paths and notes are not touched."
      onSave={async (look) => {
        await saveLook(id, look);
        navigate(`/story/${id}`);
      }}
    />
  );
}

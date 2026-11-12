import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ArtView } from '../../../art/ArtView';
import { currentStep, endingIds, endingsFound, formatPlayed, renameRun, runStats } from '../../../engine/run';
import { ensureContrast } from '../../../format/theme';
import type { Tone } from '../../../format/types';
import { startNewRun } from '../../../storage/repo';
import { UploadIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { plural } from '../../format';
import { useTitle } from '../../hooks';
import { ExportSheet } from '../../story-theme/sheets';
import { StoryThemed } from '../../story-theme/StoryTheme';
import { useRun } from '../../story-theme/useRun';
import { NotFound } from '../NotFound';
import css from './Ending.module.css';

const TONE_COLOR: Record<Tone, string | null> = { good: '#5CC8B4', bad: '#E2725B', neutral: null };
const TONE_LABEL: Record<Tone, string> = { good: 'A good ending', bad: 'A bad ending', neutral: 'An ending' };

export function Ending() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const { bundle, missing } = useRun(runId);
  const [name, setName] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const latest = useRef(bundle);
  latest.current = bundle;
  useTitle('The end');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Keep the name as it is typed.
  useEffect(() => {
    if (name === null) return;
    const timer = setTimeout(() => {
      const b = latest.current;
      if (b && name.trim() && name.trim() !== b.run.name) void b.save(renameRun(b.run, name));
    }, 400);
    return () => clearTimeout(timer);
  }, [name]);

  if (missing) return <NotFound message="That playthrough is not on this phone any more." />;
  if (!bundle) return null;
  const { run, record, story, theme } = bundle;
  if (run.status !== 'finished') return <Navigate to={`/play/${runId}`} replace />;

  const last = currentStep(run);
  const tone: Tone = last.snapshot.ending?.tone ?? 'neutral';
  const toneColor = ensureContrast(TONE_COLOR[tone] ?? theme.accent, theme.background);
  const stats = runStats(run);
  const all = endingIds(story);
  const found = endingsFound(bundle.runs).filter((e) => all.includes(e.sceneId));
  const decisions = run.steps.map((s, i) => ({ s, i })).filter(({ s }) => s.choice);
  const shown = decisions.slice(-3);
  const more = decisions.length - shown.length;
  const value = name ?? run.name;

  const saveName = async () => {
    if (name !== null && name.trim() && name.trim() !== run.name) await bundle.save(renameRun(run, name));
  };
  const review = async () => {
    await saveName();
    navigate(`/run/${runId}`);
  };
  const again = async () => {
    await saveName();
    const next = await startNewRun(story);
    navigate(`/play/${next.runId}`);
  };

  return (
    <StoryThemed theme={theme}>
      <main className={ui.page} data-tone={tone} style={{ paddingTop: 0 }}>
        <div className={css.hero}>
          <ArtView
            art={last.snapshot.art}
            source={{ storyId: record.id }}
            pixel={story.imageStyle !== 'smooth'}
            className={css.art}
          />
          <div className={css.tint} style={{ background: toneColor }} aria-hidden="true" />
        </div>
        <div className={css.head}>
          <svg viewBox="0 0 12 12" width="56" height="56" shapeRendering="crispEdges" aria-hidden="true">
            <rect x="5" y="0" width="2" height="2" fill="#3A3346" />
            <rect x="3" y="2" width="6" height="1" fill="#6B5A45" />
            <rect x="2" y="3" width="8" height="1" fill="#6B5A45" />
            <rect x="3" y="4" width="6" height="5" fill={toneColor} />
            <rect x="4" y="5" width="2" height="2" fill="#F3E3B0" />
            <rect x="2" y="9" width="8" height="1" fill="#6B5A45" />
            <rect x="3" y="10" width="6" height="1" fill="#4A3D2F" />
          </svg>
          <span className={css.theEnd} style={{ color: toneColor }}>
            THE END
          </span>
          <h1 className={css.title}>{last.snapshot.ending?.title ?? last.snapshot.title}</h1>
          <p className={ui.muted} style={{ fontSize: 13 }}>
            {TONE_LABEL[tone]} · {record.title} · ending {found.length} of {all.length} found
          </p>
        </div>

        <div className={ui.stats}>
          {[
            { value: stats.scenes, label: 'scenes' },
            { value: stats.choices, label: 'choices' },
            { value: stats.notes, label: 'notes' },
            { value: formatPlayed(stats.playedMs), label: 'played' },
          ].map((s) => (
            <div key={s.label} className={ui.stat}>
              <span className={ui.statValue} style={{ fontSize: 22 }}>
                {s.value}
              </span>
              <span className={ui.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <section className={ui.section} style={{ gap: 10 }}>
          <h2 className={ui.sectionLabel}>Your path</h2>
          {shown.length === 0 ? <p className={ui.body}>This story ended where it began.</p> : null}
          <ol className={css.path}>
            {shown.map(({ s, i }) => (
              <li key={i}>
                <span className={css.rail} aria-hidden="true">
                  <span className={css.dot} />
                  <span className={css.line} />
                </span>
                <span className={css.pathText}>
                  <span className={ui.muted}>
                    Scene {i + 1} · {s.snapshot.title}
                  </span>
                  <span className={css.pathChoice}>{s.choice!.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link to={`/run/${runId}`} className={ui.linkBtn}>
            {more > 0 ? `+ ${plural(more, 'more choice')} and ` : 'See '}
            {plural(stats.notes, 'note')} in the review
          </Link>
        </section>

        <div className={ui.section} style={{ gap: 6 }}>
          <label htmlFor="run-name" className={ui.fieldLabel}>
            Name this path
          </label>
          <input
            id="run-name"
            type="text"
            className={ui.field}
            value={value}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void saveName()}
          />
        </div>

        <div className={ui.bottom}>
          <button type="button" className={ui.primary} onClick={() => void review()}>
            Save &amp; review story
          </button>
          <div className={ui.twoCol}>
            <button
              type="button"
              className={ui.secondary}
              style={{ fontSize: 14 }}
              onClick={() => void saveName().then(() => setExporting(true))}
            >
              <UploadIcon size={16} />
              Export path
            </button>
            <button type="button" className={ui.secondary} style={{ fontSize: 14 }} onClick={() => void again()}>
              Play again
            </button>
          </div>
          <span className={`${ui.muted} ${ui.center}`}>
            Exports your choices and notes as a text file (.md) or data (.json)
          </span>
          <Link to="/" className={`${ui.linkBtn} ${css.home}`}>
            Back to the library
          </Link>
        </div>
        {exporting ? (
          <ExportSheet run={run} storyTitle={record.title} view="full" onClose={() => setExporting(false)} />
        ) : null}
      </main>
    </StoryThemed>
  );
}

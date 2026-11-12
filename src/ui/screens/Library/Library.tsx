import { Link } from 'react-router';
import { ArtView } from '../../../art/ArtView';
import { runProgress } from '../../../engine/graph';
import { choiceCount, currentStep, noteCount } from '../../../engine/run';
import type { Run } from '../../../engine/types';
import { storyCover } from '../../../format/art';
import type { StoryRecord } from '../../../storage/db';
import { listRuns, listStories } from '../../../storage/repo';
import { ChevronIcon, DownloadIcon, GearIcon, PathIcon, PenIcon, PlayIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { formatDay, plural } from '../../format';
import { useLoad, useTitle } from '../../hooks';
import css from './Library.module.css';

type Tag = 'playing' | 'finished' | 'new';
const TAG_LABEL: Record<Tag, string> = { playing: 'PLAYING', finished: 'FINISHED', new: 'NEW' };

function storyTag(runs: Run[]): Tag {
  if (runs.some((r) => r.isCurrent && r.status === 'active')) return 'playing';
  if (runs.some((r) => r.status === 'finished')) return 'finished';
  return runs.length ? 'playing' : 'new';
}

export function runMeta(run: Run): string {
  const state = run.status === 'finished' ? '' : run.status === 'left' ? 'left · ' : 'unfinished · ';
  return `${state}${plural(choiceCount(run), 'choice')} · ${plural(noteCount(run), 'note')} · ${formatDay(run.updatedAt)}`;
}

function ContinueCard({ record, run }: { record: StoryRecord; run: Run }) {
  const story = record.story;
  const step = currentStep(run);
  const filled = Math.max(run.steps.length > 1 ? 1 : 0, Math.round(runProgress(run, story) * 10));
  return (
    <section className={ui.card} aria-label="Continue your story">
      <ArtView
        art={step.snapshot.art}
        source={{ storyId: record.id }}
        pixel={story.imageStyle !== 'smooth'}
        className={css.art}
      />
      <div className={css.continueBody}>
        <div>
          <span className={css.kicker}>CONTINUE</span>
          <h2 className={css.continueTitle}>{record.title}</h2>
          <p className={css.meta}>
            Scene {run.steps.length} · {plural(choiceCount(run), 'choice')} made · {plural(noteCount(run), 'note')}
          </p>
        </div>
        <div className={css.progress} role="img" aria-label={`Progress: about ${filled * 10} percent`}>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} data-on={i < filled} />
          ))}
        </div>
        <Link to={`/play/${run.runId}`} className={ui.primary}>
          <PlayIcon />
          Continue story
        </Link>
      </div>
    </section>
  );
}

export function Library() {
  useTitle('');
  const { data } = useLoad(async () => ({ stories: await listStories(), runs: await listRuns() }), []);
  if (!data) return <main className={ui.page} aria-busy="true" />;
  const { stories, runs } = data;
  const byStory = new Map<string, Run[]>();
  for (const run of runs) {
    if (!byStory.has(run.storyId)) byStory.set(run.storyId, []);
    byStory.get(run.storyId)!.push(run);
  }
  const titles = new Map(stories.map((s) => [s.id, s.title]));
  // `runs` is newest first, so this is the current run of the most recently played story.
  const current = runs.find((r) => r.isCurrent && r.status === 'active' && titles.has(r.storyId));
  const currentStory = current ? stories.find((s) => s.id === current.storyId) : undefined;
  const saved = runs.filter((r) => titles.has(r.storyId) && !(r.isCurrent && r.status === 'active'));

  return (
    <main className={ui.page}>
      <header className={ui.header}>
        <div className={ui.headerText}>
          <h1 className={css.appTitle}>QUEST JOURNAL</h1>
          <p className={css.tagline}>Play stories, choose your path, keep notes</p>
        </div>
        <Link to="/settings" aria-label="Settings and backup" className={ui.iconBtn}>
          <GearIcon />
        </Link>
      </header>

      {current && currentStory ? <ContinueCard record={currentStory} run={current} /> : null}

      {stories.length === 0 ? (
        <div className={ui.empty}>
          <strong>No stories yet.</strong>
          <span>
            Welcome. Quest Journal plays branching stories, lets you note any passage or decision, and exports
            the path you took. Import a story file someone sent you, or make your own.
          </span>
        </div>
      ) : null}

      <nav className={ui.twoCol} aria-label="Add stories">
        <Link to="/import" className={`${ui.secondary} ${css.actionBtn}`}>
          <DownloadIcon />
          Import story
        </Link>
        <Link to="/make" className={`${ui.secondary} ${css.actionBtn}`}>
          <PenIcon />
          Make a story
        </Link>
      </nav>

      {stories.length > 0 ? (
        <section className={ui.section} aria-label="Stories">
          <div className={ui.sectionHead}>
            <h2 className={ui.sectionLabel}>Stories</h2>
            <span className={ui.muted} style={{ fontSize: 13 }}>
              {stories.length} imported
            </span>
          </div>
          {stories.map((s) => {
            const tag = storyTag(byStory.get(s.id) ?? []);
            return (
              <Link key={s.id} to={`/story/${s.id}`} className={ui.row} data-story={s.id}>
                <ArtView
                  art={storyCover(s.story)}
                  source={{ storyId: s.id }}
                  pixel={s.story.imageStyle !== 'smooth'}
                  className={css.cover}
                />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{s.title}</span>
                  <span className={ui.muted}>
                    by {s.author} · {plural(Object.keys(s.story.scenes).length, 'scene')}
                  </span>
                </span>
                <span className={css.tag} data-kind={tag}>
                  {TAG_LABEL[tag]}
                </span>
              </Link>
            );
          })}
        </section>
      ) : null}

      {stories.length > 0 ? (
        <section className={ui.section} aria-label="Saved paths">
          <div className={ui.sectionHead}>
            <h2 className={ui.sectionLabel}>Saved paths</h2>
            <span className={ui.muted} style={{ fontSize: 13 }}>
              {saved.length ? 'Tap to review' : ''}
            </span>
          </div>
          {saved.length === 0 ? (
            <p className={ui.body}>No saved paths yet. Finish a story, or rewind a decision, and the path is kept here.</p>
          ) : (
            saved.slice(0, 30).map((r) => (
              <Link key={r.runId} to={`/run/${r.runId}`} className={ui.row} style={{ minHeight: 56 }}>
                <span style={{ color: 'var(--accent-text)', display: 'flex' }}>
                  <PathIcon />
                </span>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle} style={{ fontSize: 14 }}>
                    {r.name}
                  </span>
                  <span className={ui.muted}>{runMeta(r)}</span>
                </span>
                <span style={{ color: 'var(--muted)', display: 'flex' }}>
                  <ChevronIcon />
                </span>
              </Link>
            ))
          )}
        </section>
      ) : null}
    </main>
  );
}

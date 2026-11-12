import { Link, useParams } from 'react-router';
import { Header } from '../../app-theme/Header';
import { ChevronIcon, PathIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { plural } from '../../format';
import { useTitle } from '../../hooks';
import { useStory } from '../../story-theme/useStory';
import { runMeta } from '../Library/Library';
import { NotFound } from '../NotFound';

/** Every saved path of one story. */
export function Paths() {
  const { id = '' } = useParams();
  const { bundle, missing } = useStory(id);
  useTitle('Saved paths');
  if (missing) return <NotFound message="That story is not in your library." />;
  if (!bundle) return null;
  const { record, runs } = bundle;
  return (
    <main className={ui.page}>
      <Header
        title="Saved paths"
        sub={`${record.title} · ${plural(runs.length, 'path')}`}
        backTo={`/story/${id}`}
        backLabel="Back to story menu"
      />
      {runs.length === 0 ? (
        <div className={ui.empty}>
          <strong>No paths yet.</strong>
          <span>Play the story and every run is kept here, with its choices and notes.</span>
        </div>
      ) : (
        <section className={ui.section} aria-label="Paths">
          {runs.map((r) => (
            <Link key={r.runId} to={`/run/${r.runId}`} className={ui.row}>
              <span style={{ color: 'var(--accent-text)', display: 'flex' }}>
                <PathIcon />
              </span>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{r.name}</span>
                <span className={ui.muted}>
                  {r.isCurrent && r.status === 'active' ? 'playing now · ' : ''}
                  {r.status === 'finished' ? `${r.steps[r.steps.length - 1].snapshot.ending?.title ?? 'finished'} · ` : ''}
                  {runMeta(r)}
                  {r.storyVersion && r.storyVersion !== record.version ? ` · v${r.storyVersion}` : ''}
                </span>
              </span>
              <span style={{ color: 'var(--muted)', display: 'flex' }}>
                <ChevronIcon />
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

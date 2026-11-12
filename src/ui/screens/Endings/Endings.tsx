import { Link, useParams } from 'react-router';
import { ArtView } from '../../../art/ArtView';
import { endingIds, endingsFound } from '../../../engine/run';
import { Header } from '../../app-theme/Header';
import ui from '../../app-theme/ui.module.css';
import { formatDay, plural } from '../../format';
import { useTitle } from '../../hooks';
import { StoryThemed } from '../../story-theme/StoryTheme';
import { useStory } from '../../story-theme/useStory';
import { NotFound } from '../NotFound';
import css from './Endings.module.css';

const TONE = { good: 'Good ending', bad: 'Bad ending', neutral: 'Neutral ending' };

export function Endings() {
  const { id = '' } = useParams();
  const { bundle, missing } = useStory(id);
  useTitle('Endings');
  if (missing) return <NotFound message="That story is not in your library." />;
  if (!bundle) return null;
  const { record, story, runs, theme } = bundle;
  const all = endingIds(story);
  const found = endingsFound(runs);
  const current = found.filter((e) => all.includes(e.sceneId));
  const older = found.filter((e) => !all.includes(e.sceneId));
  const locked = Math.max(0, all.length - current.length);
  const artOf = (runId: string) => {
    const run = runs.find((r) => r.runId === runId);
    return run ? run.steps[run.steps.length - 1].snapshot.art : 'default';
  };

  return (
    <StoryThemed theme={theme}>
      <main className={ui.page}>
        <Header plain title="Endings" sub={record.title} backTo={`/story/${id}`} backLabel="Back to story menu" />

        <section className={css.count} aria-label={`${current.length} of ${all.length} endings found`}>
          <div className={css.countRow}>
            <span className={css.big}>
              {current.length} / {all.length}
            </span>
            <span className={ui.muted} style={{ fontSize: 13 }}>
              endings found
            </span>
          </div>
          <div className={css.bar} style={{ gridTemplateColumns: `repeat(${Math.max(1, all.length)}, minmax(0, 1fr))` }}>
            {all.map((_, i) => (
              <span key={i} data-on={i < current.length} />
            ))}
          </div>
        </section>

        <ul className={css.list}>
          {[...current, ...older].map((e, i) => (
            <li key={e.sceneId} className={css.card} data-first={i === 0} data-testid="ending-found">
              <ArtView
                art={artOf(e.runId)}
                source={{ storyId: id }}
                pixel={story.imageStyle !== 'smooth'}
                className={css.art}
              />
              <div className={css.cardBody}>
                <span className={css.cardText}>
                  <span className={css.endTitle}>{e.title}</span>
                  <span className={ui.muted}>
                    {TONE[e.tone]} · found {formatDay(e.foundAt)} · {plural(e.choices, 'choice')}
                    {all.includes(e.sceneId) ? '' : ' · from an older version'}
                  </span>
                </span>
                <Link to={`/run/${e.runId}`} className={css.reviewBtn}>
                  Review path
                </Link>
              </div>
            </li>
          ))}
          {Array.from({ length: locked }, (_, i) => (
            <li key={`locked-${i}`} className={css.card} data-testid="ending-locked">
              <div className={css.locked}>
                <span className={css.q} aria-hidden="true">
                  ?
                </span>
                <span className={css.cardText}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Not found yet</span>
                  <span className={ui.muted}>Title hidden until you reach it</span>
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className={ui.bottom}>
          {found.length > 0 ? (
            <Link to={`/story/${id}/map`} className={ui.primary}>
              See where the branches split
            </Link>
          ) : (
            <p className={`${ui.body} ${ui.center}`}>
              Finish the story once to unlock the story map and see where the branches split.
            </p>
          )}
        </div>
      </main>
    </StoryThemed>
  );
}

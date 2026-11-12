import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArtView } from '../../../art/ArtView';
import { forgetStoryImages } from '../../../art/images';
import { endingIds, endingsFound, noteCount } from '../../../engine/run';
import { storyCover } from '../../../format/art';
import { COLOR_ROLES, describeLook, FONT_LABELS, lookColors, resolveTheme } from '../../../format/theme';
import { deleteStory, getLook, getStory, listRuns, startNewRun } from '../../../storage/repo';
import { ChevronIcon, PlayIcon } from '../../app-theme/Icons';
import { Sheet } from '../../app-theme/Sheet';
import ui from '../../app-theme/ui.module.css';
import { formatBytes, formatDate, plural } from '../../format';
import { useLoad, useTitle } from '../../hooks';
import { Library } from '../Library/Library';
import css from './StoryMenu.module.css';

/** The story's menu: a bottom sheet over the library. */
export function StoryMenu() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [details, setDetails] = useState(false);
  const { data, loading } = useLoad(
    async () => ({ record: await getStory(id), look: await getLook(id), runs: await listRuns(id) }),
    [id],
  );
  useTitle(data?.record?.title ?? '');
  const close = () => navigate('/');

  const record = data?.record;
  let sheet = null;
  if (!loading && !record) {
    sheet = (
      <Sheet label="Story not found" onClose={close}>
        <p className={ui.body}>That story is not in your library any more.</p>
        <button type="button" className={ui.secondary} onClick={close}>
          Close
        </button>
      </Sheet>
    );
  } else if (record && data) {
    const story = record.story;
    const runs = data.runs;
    const current = runs.find((r) => r.isCurrent && r.status === 'active');
    const all = endingIds(story);
    const found = endingsFound(runs).filter((e) => all.includes(e.sceneId));
    const unlocked = endingsFound(runs).length > 0;
    const theme = resolveTheme(story.theme, data.look);
    const colors = lookColors(story.theme, data.look);
    const notes = runs.reduce((n, r) => n + noteCount(r), 0);

    const play = async () => {
      const run = await startNewRun(story);
      navigate(`/play/${run.runId}`);
    };
    const remove = async () => {
      await deleteStory(id);
      forgetStoryImages(id);
      navigate('/', { replace: true });
    };

    const items = [
      {
        icon: '★',
        label: 'Endings found',
        meta: `${found.length} of ${all.length}`,
        to: `/story/${id}/endings`,
      },
      {
        icon: '⌥',
        label: 'Story map',
        meta: unlocked ? 'Unlocked: you finished the story' : 'Finish the story to unlock',
        to: unlocked ? `/story/${id}/map` : null,
      },
      {
        icon: '≡',
        label: 'Saved paths',
        meta: `${plural(runs.length, 'path')} · ${plural(notes, 'note')}`,
        to: `/story/${id}/paths`,
      },
      {
        icon: '◐',
        label: 'Change look',
        meta: `${describeLook(story.theme, data.look)} · ${FONT_LABELS[theme.font]} text`,
        to: `/story/${id}/look`,
      },
    ];

    sheet = (
      <Sheet label={`${record.title} options`} onClose={close}>
        <div className={css.head}>
          <ArtView
            art={storyCover(story)}
            source={{ storyId: id }}
            pixel={story.imageStyle !== 'smooth'}
            className={css.cover}
          />
          <div className={ui.rowText}>
            <h1 className={ui.titlePlain}>{record.title}</h1>
            <span className={ui.muted}>
              by {record.author}
              {record.version ? ` · version ${record.version}` : ''}
            </span>
            <span className={css.look}>
              <span className={css.dots} aria-hidden="true">
                {COLOR_ROLES.map((r) => (
                  <span key={r} style={{ background: colors[r] }} />
                ))}
              </span>
              Look: {describeLook(story.theme, data.look)}
            </span>
          </div>
        </div>

        {current ? (
          <Link to={`/play/${current.runId}`} className={ui.primary}>
            <PlayIcon size={16} />
            Continue story
          </Link>
        ) : null}
        <button type="button" className={current ? ui.secondary : ui.primary} onClick={() => void play()}>
          {current ? null : <PlayIcon size={16} />}
          {runs.length ? 'Play again from the start' : 'Play from the start'}
        </button>

        <nav aria-label="Story options" className={css.items}>
          {items.map((i) => {
            const inner = (
              <>
                <span className={css.itemIcon} aria-hidden="true">
                  {i.icon}
                </span>
                <span className={ui.rowText} style={{ gap: 0 }}>
                  <span className={css.itemLabel}>{i.label}</span>
                  <span className={ui.muted}>{i.meta}</span>
                </span>
                {i.to ? (
                  <span style={{ color: 'var(--muted)', display: 'flex' }}>
                    <ChevronIcon />
                  </span>
                ) : null}
              </>
            );
            return i.to ? (
              <Link key={i.label} to={i.to} className={css.item}>
                {inner}
              </Link>
            ) : (
              <button key={i.label} type="button" className={css.item} disabled aria-disabled="true">
                {inner}
              </button>
            );
          })}
          <button type="button" className={css.item} aria-expanded={details} onClick={() => setDetails(!details)}>
            <span className={css.itemIcon} aria-hidden="true">
              i
            </span>
            <span className={ui.rowText} style={{ gap: 0 }}>
              <span className={css.itemLabel}>Story details</span>
              <span className={ui.muted}>
                {plural(Object.keys(story.scenes).length, 'scene')} · imported {formatDate(record.importedAt)}
              </span>
            </span>
          </button>
          {details ? (
            <div className={css.details}>
              {record.summary ? <p className={css.summary}>{record.summary}</p> : null}
              <span>
                {plural(all.length, 'ending')} · {plural(story.characters?.length ?? 0, 'character')} ·{' '}
                {record.isPackage ? 'package with images' : 'plain story file'} · {formatBytes(record.sizeBytes)}
              </span>
              <span>Story id: {record.id}</span>
              {record.updatedAt !== record.importedAt ? <span>Updated {formatDate(record.updatedAt)}</span> : null}
              {record.sourceUrl ? <span style={{ overflowWrap: 'anywhere' }}>From {record.sourceUrl}</span> : null}
            </div>
          ) : null}
        </nav>

        {confirming ? (
          <div className={css.confirm} role="alertdialog" aria-label="Remove this story?">
            <strong>Remove “{record.title}”?</strong>
            <span className={ui.body}>
              Its {plural(runs.length, 'saved path')} and {plural(notes, 'note')} on this phone are deleted. This
              can’t be undone.
            </span>
            <div className={ui.twoCol}>
              <button type="button" className={ui.secondary} onClick={() => setConfirming(false)}>
                Keep it
              </button>
              <button type="button" className={ui.danger} onClick={() => void remove()}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" className={ui.danger} onClick={() => setConfirming(true)}>
              Remove from library
            </button>
            <span className={`${ui.muted} ${ui.center}`}>
              Removing keeps your exported files. Saved paths and notes on this phone are deleted.
            </span>
          </>
        )}
      </Sheet>
    );
  }

  return (
    <>
      <div aria-hidden="true" inert>
        <Library />
      </div>
      {sheet}
    </>
  );
}

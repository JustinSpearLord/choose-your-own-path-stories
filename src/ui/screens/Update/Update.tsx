import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { forgetStoryImages } from '../../../art/images';
import { applyUpdateToRuns, planUpdate, versionLabel } from '../../../import/update';
import { setPending, usePending } from '../../../import/pending';
import { getImages, getLook, getStory, listRuns, saveRun, saveStory } from '../../../storage/repo';
import { Header } from '../../app-theme/Header';
import { ArrowIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { plural } from '../../format';
import { useLoad, useTitle } from '../../hooks';
import css from './Update.module.css';

/** Importing a story that is already in the library: show what an update does, then apply or skip it. */
export function Update() {
  useTitle('New version');
  const navigate = useNavigate();
  const pending = usePending();
  const incoming = pending?.file.story ?? null;
  const leaving = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!incoming && !leaving.current) navigate('/import', { replace: true });
  }, [incoming, navigate]);

  const id = incoming?.id ?? '';
  const { data } = useLoad(async () => {
    if (!id) return null;
    const record = await getStory(id);
    if (!record) return null;
    const [images, runs, look] = await Promise.all([getImages(id), listRuns(id), getLook(id)]);
    return { record, images: new Map(images.map((i) => [i.path, i.data])), runs, look };
  }, [id]);

  useEffect(() => {
    // Not in the library after all: this is a plain import.
    if (incoming && data === null && !leaving.current) navigate('/import/look', { replace: true });
  }, [incoming, data, navigate]);

  if (!pending || !incoming || !data) return <main className={ui.page} aria-busy="true" />;
  const { record, runs, look } = data;
  const plan = planUpdate(
    { story: record.story, images: data.images },
    { story: incoming, images: pending.file.images },
    runs,
    look,
  );
  const oldLabel = versionLabel(plan.oldVersion);
  const newLabel = versionLabel(plan.newVersion);
  const active = runs.some((r) => r.isCurrent && r.status === 'active');

  const done = () => {
    leaving.current = true;
    navigate('/', { replace: true });
    setPending(null);
  };
  const apply = async () => {
    setBusy(true);
    await saveStory({
      story: incoming,
      isPackage: pending.file.isPackage,
      sizeBytes: pending.file.sizeBytes,
      images: pending.file.images,
      imageMeta: pending.file.imageMeta,
      sourceUrl: pending.sourceUrl ?? record.sourceUrl,
    });
    forgetStoryImages(incoming.id);
    for (const run of applyUpdateToRuns(runs, incoming)) await saveRun(run);
    done();
  };

  return (
    <main className={ui.page}>
      <Header title="New version" backTo="/import" backLabel="Back" />

      <section className={ui.cardPad} style={{ gap: 12, padding: 16 }}>
        <span style={{ fontSize: 14 }}>You already have this story.</span>
        <h2 className={css.name}>{record.title}</h2>
        <div className={css.compare}>
          <div className={css.side}>
            <span className={css.sideLabel}>ON THIS PHONE</span>
            <span className={css.version}>{oldLabel}</span>
            <span className={ui.muted} style={{ fontSize: 11 }}>
              {plural(plan.oldScenes, 'scene')}
            </span>
          </div>
          <span style={{ color: 'var(--accent)', display: 'flex' }}>
            <ArrowIcon />
          </span>
          <div className={css.side} data-new="true">
            <span className={css.sideLabel} style={{ color: 'var(--accent)' }}>
              NEW FILE
            </span>
            <span className={css.version}>{newLabel}</span>
            <span className={ui.muted} style={{ fontSize: 11 }}>
              {plural(plan.newScenes, 'scene')}
            </span>
          </div>
        </div>
      </section>

      {plan.identical ? (
        <>
          <div className={ui.notice} role="status">
            <span className={ui.checkDot} style={{ background: 'var(--info)' }} aria-hidden="true" />
            <span>
              <strong>You already have this version.</strong> The file is the same as the story on this phone, so
              there is nothing to update.
            </span>
          </div>
          <div className={ui.bottom}>
            <button type="button" className={ui.primary} onClick={done}>
              Back to the library
            </button>
          </div>
        </>
      ) : (
        <>
          {plan.direction !== 'newer' ? (
            <div className={ui.notice} role="status">
              <span className={ui.checkDot} style={{ background: 'var(--accent)' }} aria-hidden="true" />
              <span>
                {plan.direction === 'older' ? (
                  <>
                    <strong>This file is older.</strong> It is {newLabel}; you have {oldLabel}. Updating replaces
                    the newer story with the older one.
                  </>
                ) : (
                  <>
                    <strong>Same version number, different story.</strong> The author changed the file without
                    changing its version.
                  </>
                )}
              </span>
            </div>
          ) : null}
          <section className={ui.section}>
            <h2 className={ui.sectionLabel}>What happens to your play</h2>
            <ul className={ui.checkList} style={{ gap: 10 }} data-testid="update-effects">
              {plan.effects.map((f, i) => (
                <li key={i} className={ui.checkItem}>
                  <span
                    className={ui.checkDot}
                    style={{ background: f.tone === 'ok' ? 'var(--info)' : 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong style={{ fontWeight: 600 }}>{f.title}</strong> {f.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className={ui.bottom}>
            <button type="button" className={ui.primary} disabled={busy} onClick={() => void apply()}>
              {active ? 'Update and keep my progress' : 'Update the story'}
            </button>
            <button type="button" className={ui.secondary} onClick={done}>
              Keep {oldLabel}, don’t update
            </button>
          </div>
        </>
      )}
    </main>
  );
}

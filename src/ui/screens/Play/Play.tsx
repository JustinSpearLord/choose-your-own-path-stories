import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router';
import { artLabel, ArtView, Portrait } from '../../../art/ArtView';
import { canChoose, choose, currentStep, noteCount, setChoiceNote, setPassageNote } from '../../../engine/run';
import { nameColor } from '../../../format/theme';
import type { Passage } from '../../../format/types';
import { Header } from '../../app-theme/Header';
import { ChevronIcon, PenIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { plural } from '../../format';
import { useTitle } from '../../hooks';
import { StoryThemed } from '../../story-theme/StoryTheme';
import st from '../../story-theme/story.module.css';
import { type RunBundle, useRun } from '../../story-theme/useRun';
import { NotFound } from '../NotFound';

/** Holds the run for the play and decision screens, so moving between them never reloads it. */
export function PlayLayout() {
  const { runId = '' } = useParams();
  const { bundle, missing } = useRun(runId, true);
  if (missing) return <NotFound message="That playthrough is not on this phone any more." />;
  if (!bundle) return null;
  if (bundle.run.status === 'left') return <Navigate to={`/run/${runId}`} replace />;
  return (
    <StoryThemed theme={bundle.theme}>
      <Outlet context={bundle} />
    </StoryThemed>
  );
}

export function passageText(p: Passage): string {
  return typeof p === 'string' ? p : `“${p.line}”`;
}

export function PlayScene() {
  const b = useOutletContext<RunBundle>();
  const { run, story, record } = b;
  const stepIndex = run.steps.length - 1;
  const step = currentStep(run);
  const { snapshot } = step;
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const pixel = story.imageStyle !== 'smooth';
  const source = { storyId: record.id };
  const finished = run.status === 'finished';
  useTitle(`${snapshot.title} · ${record.title}`);

  useEffect(() => {
    setSelected(null);
    window.scrollTo(0, 0);
  }, [stepIndex]);

  const noteFor = (i: number) => step.notes.find((n) => n.passage === i)?.text ?? '';
  const sceneNote = step.notes.find((n) => n.passage === null)?.text;
  const pick = (i: number) => {
    if (selected === i) {
      setSelected(null);
      return;
    }
    setSelected(i);
    setDraft(noteFor(i));
  };
  const saveNote = async () => {
    if (selected === null) return;
    await b.save(setPassageNote(run, stepIndex, selected, draft));
    setSelected(null);
  };
  const notes = noteCount(run);

  return (
    <main className={ui.pageFlush}>
      <div className={st.top}>
        <Header
          plain
          title={record.title}
          sub={`Scene ${run.steps.length} · ${snapshot.title}`}
          backTo="/"
          backLabel="Back to library"
          right={
            <span className={st.chip} data-testid="note-count">
              <PenIcon size={14} />
              {plural(notes, 'note')}
            </span>
          }
        />
      </div>

      <ArtView art={snapshot.art} source={source} pixel={pixel} className={st.art} label={artLabel(snapshot.art)} />

      <div className={st.passages}>
        <p className={st.hint}>Tap a passage to add a note</p>
        {sceneNote ? (
          <div className={st.note}>
            <span className={st.noteHead}>NOTE · ON THIS SCENE</span>
            <span className={st.noteText}>{sceneNote}</span>
          </div>
        ) : null}
        {snapshot.passages.map((p, i) => {
          const on = selected === i;
          const note = noteFor(i);
          const speaker = typeof p === 'string' ? null : (snapshot.speakers[p.speaker] ?? null);
          const speakerId = typeof p === 'string' ? '' : p.speaker;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className={st.passage}
                aria-pressed={on}
                data-note={note ? 'true' : 'false'}
                data-testid="passage"
                onClick={() => pick(i)}
              >
                <span className={st.mark} aria-hidden="true" />
                <span className={st.passageBody}>
                  {typeof p !== 'string' ? (
                    <span
                      className={st.speaker}
                      style={{
                        color: nameColor(speaker?.color ?? '#8A8494', on ? b.theme.panel : b.theme.background),
                      }}
                    >
                      <Portrait
                        id={speakerId}
                        name={speaker?.name ?? speakerId}
                        color={speaker?.color ?? '#8A8494'}
                        portrait={speaker?.portrait}
                        source={source}
                        pixel={pixel}
                        size={24}
                      />
                      {speaker?.name ?? speakerId}
                    </span>
                  ) : null}
                  <span>{passageText(p)}</span>
                  {note ? (
                    <span className={st.noteLine}>
                      <PenIcon size={12} />
                      <span>
                        <span className="visually-hidden">Your note: </span>
                        {note}
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
              {on ? (
                <NoteEditor
                  id={`passage-note-${i}`}
                  label="Note on this passage"
                  placeholder="An idea, a line to keep, a question for your game…"
                  value={draft}
                  onChange={setDraft}
                  onCancel={() => setSelected(null)}
                  onSave={() => void saveNote()}
                  hadNote={!!note}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={st.footer}>
        {finished ? (
          <Link to={`/run/${run.runId}/end`} className={ui.primary}>
            The end
            <ChevronIcon size={18} />
          </Link>
        ) : (
          <Link to={`/play/${run.runId}/decide`} className={ui.primary}>
            Continue
            <ChevronIcon size={18} />
          </Link>
        )}
      </div>
    </main>
  );
}

export function NoteEditor(props: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onCancel: () => void;
  onSave: () => void;
  hadNote: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: false });
  }, []);
  return (
    <div className={st.noteBox}>
      <label htmlFor={props.id}>{props.label}</label>
      <textarea
        ref={ref}
        id={props.id}
        rows={3}
        className={st.noteField}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <div className={st.noteActions}>
        <button type="button" className={st.smallBtn} onClick={props.onCancel}>
          Cancel
        </button>
        <button type="button" className={st.smallPrimary} onClick={props.onSave}>
          {props.hadNote && !props.value.trim() ? 'Delete note' : 'Save note'}
        </button>
      </div>
    </div>
  );
}

const KEYS = ['A', 'B', 'C'];

export function Decision() {
  const b = useOutletContext<RunBundle>();
  const navigate = useNavigate();
  const { run, story, record } = b;
  const stepIndex = run.steps.length - 1;
  const step = currentStep(run);
  const { snapshot } = step;
  const [picked, setPicked] = useState<number | null>(null);
  const [note, setNote] = useState(step.choiceNote ?? '');
  const [problem, setProblem] = useState('');
  const dirty = useRef(false);
  const latest = useRef({ run, note });
  latest.current = { run, note };
  useTitle(`Decision · ${record.title}`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Keep the half-written decision note, so closing the app here loses nothing.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      dirty.current = false;
      void b.save(setChoiceNote(latest.current.run, stepIndex, latest.current.note));
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  // Leaving within the half second still keeps the note.
  useEffect(
    () => () => {
      if (dirty.current) void b.save(setChoiceNote(latest.current.run, stepIndex, latest.current.note));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!canChoose(run)) return <Navigate to={`/play/${run.runId}`} replace />;
  const decisionNumber = run.steps.filter((s) => s.choice).length + 1;

  const confirm = async () => {
    if (picked === null) return;
    try {
      dirty.current = false;
      const next = choose(run, story, picked, { note });
      await b.save(next);
      navigate(`/play/${run.runId}`, { replace: true });
    } catch {
      setProblem('That choice leads to a scene that is missing from this version of the story.');
    }
  };

  return (
    <main className={ui.pageFlush}>
      <div className={st.top}>
        <Header
          plain
          title={record.title}
          sub={`Scene ${run.steps.length} · Decision ${decisionNumber}`}
          backTo={`/play/${run.runId}`}
          backLabel="Back to scene"
        />
      </div>
      <ArtView art={snapshot.art} source={{ storyId: record.id }} pixel={story.imageStyle !== 'smooth'} className={st.artStrip} />

      <div className={st.decisionBody}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className={st.kicker}>DECISION</span>
          <h1 className={st.prompt}>{snapshot.prompt}</h1>
        </div>

        <div role="radiogroup" aria-label="Choices" className={st.choices}>
          {snapshot.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              className={st.choice}
              data-testid="choice"
              onClick={() => setPicked(i)}
            >
              <span className={st.choiceKey} aria-hidden="true">
                {KEYS[i]}
              </span>
              <span className={st.choiceText}>{c.text}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="choice-note" className={ui.fieldLabel}>
            Note on this decision
            <span className={ui.muted} style={{ fontWeight: 400 }}>
              optional
            </span>
          </label>
          <textarea
            id="choice-note"
            rows={3}
            className={ui.field}
            placeholder="Why this choice? What would the other one have changed?"
            value={note}
            onChange={(e) => {
              dirty.current = true;
              setNote(e.target.value);
            }}
          />
        </div>

        {problem ? (
          <p className={ui.body} role="alert">
            {problem}
          </p>
        ) : null}

        <div className={ui.bottom}>
          <button type="button" className={ui.primary} disabled={picked === null} onClick={() => void confirm()}>
            {picked === null ? 'Pick a choice to confirm' : `Confirm choice ${KEYS[picked]}`}
          </button>
        </div>
      </div>
    </main>
  );
}

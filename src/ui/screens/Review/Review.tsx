import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { currentStep, setChoiceNote, setPassageNote } from '../../../engine/run';
import type { Run, Step } from '../../../engine/types';
import { exportFileName, type ExportView } from '../../../export/path';
import { nameColor } from '../../../format/theme';
import type { Passage } from '../../../format/types';
import { refreshCurrentStep } from '../../../import/update';
import { Header } from '../../app-theme/Header';
import { PlayIcon, RewindIcon, UploadIcon } from '../../app-theme/Icons';
import ui from '../../app-theme/ui.module.css';
import { formatDate } from '../../format';
import { useTitle } from '../../hooks';
import { exportMessage, exportRun, ExportSheet, RewindSheet } from '../../story-theme/sheets';
import { StoryThemed } from '../../story-theme/StoryTheme';
import st from '../../story-theme/story.module.css';
import { type RunBundle, useRun } from '../../story-theme/useRun';
import { NotFound } from '../NotFound';
import { NoteEditor } from '../Play/Play';
import css from './Review.module.css';

const TABS: { id: ExportView; label: string }[] = [
  { id: 'full', label: 'Full story' },
  { id: 'choices', label: 'Choices' },
  { id: 'notes', label: 'Notes' },
];
const KEYS = ['A', 'B', 'C'];

function excerpt(p: Passage | undefined): string {
  if (p === undefined) return '';
  const text = typeof p === 'string' ? p : p.line;
  return text.length > 44 ? `${text.slice(0, 42).trimEnd()}…` : text;
}

type Editing = { step: number; target: number | null | 'choice' } | null;

function NoteCard(props: {
  head: string;
  text: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (text: string) => void;
  id: string;
}) {
  const [draft, setDraft] = useState(props.text);
  if (props.editing) {
    return (
      <NoteEditor
        id={props.id}
        label={`Edit note`}
        placeholder="Leave empty to delete this note"
        value={draft}
        onChange={setDraft}
        onCancel={props.onCancel}
        onSave={() => props.onSave(draft)}
        hadNote
      />
    );
  }
  return (
    <div className={st.note} data-testid="note">
      <span className={st.noteHead}>
        <span>{props.head}</span>
        <button
          type="button"
          className={st.editBtn}
          onClick={() => {
            setDraft(props.text);
            props.onEdit();
          }}
        >
          Edit<span className="visually-hidden"> note</span>
        </button>
      </span>
      <span className={st.noteText}>{props.text}</span>
    </div>
  );
}

function Entry(props: {
  b: RunBundle;
  step: Step;
  index: number;
  view: ExportView;
  editing: Editing;
  setEditing: (e: Editing) => void;
  onRewind: () => void;
}) {
  const { b, step, index, view, editing, setEditing } = props;
  const { run, theme } = b;
  const isEnd = !!step.snapshot.ending && index === run.steps.length - 1 && run.status === 'finished';
  const showText = view === 'full';
  const showNotes = view !== 'choices';
  const showChoice = view !== 'notes' && step.snapshot.choices.length > 0 && !!step.choice;
  const isEditing = (target: number | null | 'choice') => editing?.step === index && editing.target === target;
  const savePassage = (passage: number | null) => async (text: string) => {
    await b.save(setPassageNote(run, index, passage, text));
    setEditing(null);
  };

  return (
    <li className={css.entry} data-testid="review-entry">
      <span className={css.rail}>
        <span className={css.num} data-end={isEnd}>
          {isEnd ? '★' : index + 1}
        </span>
        <span className={css.line} aria-hidden="true" />
      </span>
      <div className={css.body}>
        <h2 className={css.scene}>
          {isEnd ? `Ending · ${step.snapshot.ending!.title}` : `Scene ${index + 1} · ${step.snapshot.title}`}
        </h2>

        {showText
          ? step.snapshot.passages.map((p, i) => (
              <p key={i} className={css.text}>
                {typeof p === 'string' ? (
                  p
                ) : (
                  <>
                    <span
                      className={css.who}
                      style={{ color: nameColor(step.snapshot.speakers[p.speaker]?.color ?? '#8A8494', theme.background) }}
                    >
                      {step.snapshot.speakers[p.speaker]?.name ?? p.speaker}
                    </span>{' '}
                    “{p.line}”
                  </>
                )}
              </p>
            ))
          : null}

        {showNotes
          ? step.notes.map((n) => (
              <NoteCard
                key={String(n.passage)}
                id={`note-${index}-${n.passage}`}
                head={n.passage === null ? 'NOTE · ON THIS SCENE' : `NOTE · “${excerpt(step.snapshot.passages[n.passage])}”`}
                text={n.text}
                editing={isEditing(n.passage)}
                onEdit={() => setEditing({ step: index, target: n.passage })}
                onCancel={() => setEditing(null)}
                onSave={savePassage(n.passage)}
              />
            ))
          : null}

        {showChoice ? (
          <div className={css.options}>
            {step.snapshot.choices.map((c, i) => {
              const taken = step.choice?.index === i;
              return (
                <div key={i} className={st.option} data-taken={taken}>
                  <span className={st.optionKey} aria-hidden="true">
                    {KEYS[i]}
                  </span>
                  <span style={{ flex: 1 }}>{c.text}</span>
                  {taken ? <span className={st.optionTag}>CHOSEN</span> : <span className="visually-hidden">skipped</span>}
                </div>
              );
            })}
            <button type="button" className={ui.linkBtn} style={{ fontSize: 13 }} onClick={props.onRewind}>
              <RewindIcon />
              Rewind to this decision
            </button>
          </div>
        ) : null}

        {showNotes && step.choiceNote ? (
          <NoteCard
            id={`note-${index}-choice`}
            head="NOTE · ON THIS DECISION"
            text={step.choiceNote}
            editing={isEditing('choice')}
            onEdit={() => setEditing({ step: index, target: 'choice' })}
            onCancel={() => setEditing(null)}
            onSave={async (text) => {
              await b.save(setChoiceNote(run, index, text));
              setEditing(null);
            }}
          />
        ) : null}
      </div>
    </li>
  );
}

function subtitle(run: Run, storyTitle: string): string {
  if (run.status === 'finished') {
    const last = currentStep(run);
    return `${storyTitle} · ended at ${last.snapshot.ending?.title ?? last.snapshot.title}`;
  }
  return `${storyTitle} · ${run.status === 'left' ? 'left unfinished' : 'not finished yet'}`;
}

export function Review() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const { bundle, missing } = useRun(runId);
  const [view, setView] = useState<ExportView>('full');
  const [editing, setEditing] = useState<Editing>(null);
  const [rewindAt, setRewindAt] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  useTitle(bundle ? bundle.run.name : 'Review');

  if (missing) return <NotFound message="That saved path is not on this phone any more." />;
  if (!bundle) return null;
  const { run, record, story, theme } = bundle;
  const entries = run.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => view !== 'notes' || step.notes.length > 0 || !!step.choiceNote)
    .filter(({ step }) => view !== 'choices' || !!step.choice);
  const oldVersion = run.storyVersion !== record.version;
  const canContinue = run.status === 'active' && !!story.scenes[currentStep(run).sceneId];

  const quickExport = async (kind: 'json' | 'md') => {
    const result = await exportRun(run, record.title, kind, view);
    setStatus(exportMessage(result, exportFileName(run, kind)));
  };
  const resume = async () => {
    const fresh = refreshCurrentStep(run, story) ?? run;
    await bundle.save({ ...fresh, isCurrent: true, updatedAt: new Date().toISOString() });
    navigate(`/play/${run.runId}`);
  };

  return (
    <StoryThemed theme={theme}>
      <main className={ui.page} style={{ gap: 16 }}>
        <Header
          plain
          title={run.name}
          sub={
            <>
              {subtitle(run, record.title)}
              {oldVersion && run.storyVersion ? ` · played in v${run.storyVersion}` : ''}
              {` · ${formatDate(run.finishedAt ?? run.updatedAt)}`}
            </>
          }
          backTo="/"
          backLabel="Back to library"
          right={
            <button type="button" aria-label="Export this path" className={ui.iconBtn} onClick={() => setExporting(true)}>
              <span style={{ color: 'var(--accent-on-panel)', display: 'flex' }}>
                <UploadIcon />
              </span>
            </button>
          }
        />

        {canContinue ? (
          <button type="button" className={ui.secondary} onClick={() => void resume()}>
            <PlayIcon size={16} />
            Continue this path
          </button>
        ) : null}

        <div role="tablist" aria-label="Review view" className={ui.segmented}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={view === t.id}
              className={ui.segment}
              onClick={() => {
                setView(t.id);
                setEditing(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className={ui.empty}>
            {view === 'notes'
              ? 'No notes on this path. Tap a passage while you play, or write a note with a decision.'
              : 'No decisions made on this path yet.'}
          </div>
        ) : (
          <ol className={css.timeline}>
            {entries.map(({ step, index }) => (
              <Entry
                key={index}
                b={bundle}
                step={step}
                index={index}
                view={view}
                editing={editing}
                setEditing={setEditing}
                onRewind={() => setRewindAt(index)}
              />
            ))}
          </ol>
        )}

        <div className={ui.bottom}>
          <div className={ui.twoCol}>
            <button type="button" className={ui.secondary} style={{ minHeight: 52 }} onClick={() => void quickExport('json')}>
              Export .json
            </button>
            <button type="button" className={ui.primary} style={{ fontSize: 15 }} onClick={() => void quickExport('md')}>
              Export as text
            </button>
          </div>
          <span className={`${ui.muted} ${ui.center}`}>
            Text export reads like a script: scenes, your choices, the ones you skipped, and every note. It
            follows the tab you are on.
          </span>
          <p className={`${ui.body} ${ui.center}`} role="status" aria-live="polite">
            {status}
          </p>
        </div>

        {rewindAt !== null ? (
          <RewindSheet run={run} stepIndex={rewindAt} story={story} onClose={() => setRewindAt(null)} />
        ) : null}
        {exporting ? (
          <ExportSheet run={run} storyTitle={record.title} view={view} onClose={() => setExporting(false)} />
        ) : null}
      </main>
    </StoryThemed>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { noteCount } from '../../engine/run';
import type { Run } from '../../engine/types';
import { exportFileName, type ExportView, pathJson, pathMarkdown } from '../../export/path';
import { shareOrDownload, type ShareResult } from '../../export/share';
import type { Story } from '../../format/types';
import { rewindRun } from '../../storage/repo';
import { SaveIcon } from '../app-theme/Icons';
import { Sheet } from '../app-theme/Sheet';
import ui from '../app-theme/ui.module.css';
import { plural } from '../format';
import st from './story.module.css';

const KEYS = ['A', 'B', 'C'];

export async function exportRun(run: Run, storyTitle: string, kind: 'json' | 'md', view: ExportView): Promise<ShareResult> {
  const blob =
    kind === 'json'
      ? new Blob([pathJson(run, storyTitle)], { type: 'application/json' })
      : new Blob([pathMarkdown(run, storyTitle, view)], { type: 'text/markdown' });
  return shareOrDownload(blob, exportFileName(run, kind), `${storyTitle}: ${run.name}`);
}

export function exportMessage(result: ShareResult, name: string): string {
  if (result === 'cancelled') return 'Export cancelled.';
  return result === 'shared' ? `Shared ${name}.` : `Saved ${name} to your downloads.`;
}

/** Pick a file type and export the run. */
export function ExportSheet(props: { run: Run; storyTitle: string; view: ExportView; onClose: () => void }) {
  const { run, storyTitle, view } = props;
  const [status, setStatus] = useState('');
  const go = async (kind: 'json' | 'md') => {
    const result = await exportRun(run, storyTitle, kind, view);
    setStatus(exportMessage(result, exportFileName(run, kind)));
  };
  return (
    <Sheet label="Export this path" onClose={props.onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className={st.kicker}>EXPORT</span>
        <h2 className={st.prompt}>{run.name}</h2>
      </div>
      <p className={ui.body}>
        Send the file to the story’s author yourself, by message or email. Nothing leaves this phone until you
        share it.
      </p>
      <button type="button" className={ui.primary} onClick={() => void go('md')}>
        Text file (.md)
      </button>
      <span className={`${ui.muted} ${ui.center}`}>
        Reads like a script: scenes, your choices, the ones you skipped, and every note.
      </span>
      <button type="button" className={ui.secondary} onClick={() => void go('json')}>
        Data file (.path.json)
      </button>
      <span className={`${ui.muted} ${ui.center}`}>For tools and scripts.</span>
      <p className={ui.body} role="status" aria-live="polite">
        {status}
      </p>
      <button type="button" className={ui.secondary} onClick={props.onClose}>
        Done
      </button>
    </Sheet>
  );
}

/** Confirms a rewind, then starts the new run at that decision. */
export function RewindSheet(props: { run: Run; stepIndex: number; story: Story; onClose: () => void }) {
  const { run, stepIndex, story } = props;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const step = run.steps[stepIndex];
  const installed = story.scenes[step.sceneId];
  const options = installed?.choices ?? step.snapshot.choices;
  const playable = !!installed && options.every((c) => story.scenes[c.to]);
  const notes = noteCount(run);
  const where = `Scene ${stepIndex + 1} · ${step.snapshot.title}`;

  const go = async () => {
    setBusy(true);
    const next = await rewindRun(run, stepIndex, story);
    navigate(`/play/${next.runId}/decide`);
  };

  return (
    <Sheet label={`Rewind to scene ${stepIndex + 1}`} onClose={props.onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className={st.kicker}>REWIND</span>
        <h2 className={st.prompt}>Go back to {where}?</h2>
      </div>
      <p className={ui.body} style={{ fontSize: 14 }}>
        {playable
          ? 'You’ll make this decision again and play on from there. Nothing is lost.'
          : 'This scene has changed too much in the version of the story you have now, so it can’t be replayed from here.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map((o, i) => {
          const last = step.choice?.text === o.text || (step.choice?.index === i && !installed);
          return (
            <div key={i} className={st.option} data-taken={last} style={{ minHeight: 44 }}>
              <span className={st.optionKey} aria-hidden="true">
                {KEYS[i]}
              </span>
              <span style={{ flex: 1 }}>{o.text}</span>
              <span className={last ? st.optionTag : ui.muted} style={{ fontSize: 11 }}>
                {last ? 'chosen last time' : 'new'}
              </span>
            </div>
          );
        })}
      </div>

      <div className={ui.notice} style={{ border: 'none', background: 'var(--panel)' }}>
        <span style={{ color: 'var(--accent-on-panel)', display: 'flex', marginTop: 2 }}>
          <SaveIcon />
        </span>
        <span>
          “{run.name}” stays saved as it is, with its {plural(notes, 'note')}. The new run starts with your
          choices and notes up to Scene {stepIndex + 1}.
        </span>
      </div>

      <div className={ui.twoCol}>
        <button type="button" className={ui.secondary} style={{ minHeight: 52 }} onClick={props.onClose}>
          Cancel
        </button>
        <button type="button" className={ui.primary} disabled={!playable || busy} onClick={() => void go()}>
          Rewind
        </button>
      </div>
    </Sheet>
  );
}

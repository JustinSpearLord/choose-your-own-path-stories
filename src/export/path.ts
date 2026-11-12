// A run as a .path.json file (quest-path/1) and as readable text (.md). See docs/story-format.md.
import { choiceCount, currentStep, noteCount } from '../engine/run';
import type { Run, Step } from '../engine/types';
import type { Passage, PathFile, PathStep } from '../format/types';
import { formatDate, slug } from '../ui/format';

export type ExportView = 'full' | 'choices' | 'notes';

const isoSeconds = (iso: string) => iso.replace(/\.\d+Z$/, 'Z');

export function buildPathFile(run: Run, storyTitle: string): PathFile {
  const steps: PathStep[] = run.steps.map((step) => ({
    scene: step.sceneId,
    notes: step.notes.map((n) => ({ passage: n.passage, text: n.text })),
    ...(step.choice
      ? {
          choice: { index: step.choice.index, text: step.choice.text, to: step.choice.to },
          skipped: [...step.skipped],
        }
      : {}),
    ...(step.choice && step.choiceNote ? { choiceNote: step.choiceNote } : {}),
  }));
  const finished = run.status === 'finished' && run.finishedAt && run.endingSceneId;
  return {
    format: 'quest-path/1',
    story: { id: run.storyId, title: storyTitle, ...(run.storyVersion ? { version: run.storyVersion } : {}) },
    name: run.name,
    started: isoSeconds(run.startedAt),
    ...(finished
      ? {
          finished: isoSeconds(run.finishedAt!),
          ending: {
            scene: run.endingSceneId!,
            title: currentStep(run).snapshot.ending?.title ?? currentStep(run).snapshot.title,
          },
        }
      : {}),
    steps,
  };
}

export function pathJson(run: Run, storyTitle: string): string {
  return JSON.stringify(buildPathFile(run, storyTitle), null, 2) + '\n';
}

function passageLine(p: Passage, step: Step): string {
  if (typeof p === 'string') return p;
  return `**${step.snapshot.speakers[p.speaker]?.name ?? p.speaker}:** “${p.line}”`;
}

function quote(label: string, text: string): string {
  const [first, ...rest] = text.split(/\r?\n/);
  return [`> ${label}: ${first}`, ...rest.map((l) => `> ${l}`)].join('\n');
}

/**
 * The run as a script: scenes, the choice made, the ones skipped, and every note.
 * `view` follows the Review tabs: the full story, only the choices, or only the notes.
 */
export function pathMarkdown(run: Run, storyTitle: string, view: ExportView = 'full'): string {
  const ending = run.status === 'finished' ? currentStep(run).snapshot.ending?.title : undefined;
  const state = ending ? `Ending: ${ending}` : run.status === 'left' ? 'Left unfinished' : 'In progress';
  const choices = choiceCount(run);
  const notes = noteCount(run);
  const out: string[] = [
    `# ${storyTitle}: ${run.name}`,
    `${state} · ${choices} ${choices === 1 ? 'choice' : 'choices'} · ${notes} ${notes === 1 ? 'note' : 'notes'} · ${formatDate(run.finishedAt ?? run.updatedAt)}`,
  ];

  run.steps.forEach((step, index) => {
    const hasNotes = step.notes.length > 0 || !!step.choiceNote;
    if (view === 'notes' && !hasNotes) return;
    if (view === 'choices' && !step.choice) return;
    const block: string[] = [`## ${index + 1}. ${step.snapshot.title}`];
    const sceneNote = step.notes.find((n) => n.passage === null);

    if (view !== 'choices') {
      if (sceneNote) block.push(quote('Note on this scene', sceneNote.text), '');
      const lines: string[] = [];
      step.snapshot.passages.forEach((p, i) => {
        const note = step.notes.find((n) => n.passage === i);
        if (view === 'notes' && !note) return;
        if (lines.length) lines.push('');
        lines.push(passageLine(p, step));
        if (note) lines.push(quote('Note', note.text));
      });
      block.push(...lines);
      if (view === 'full' && step.snapshot.ending && index === run.steps.length - 1) {
        block.push('', `**The end:** ${step.snapshot.ending.title}`);
      }
    }

    if (step.choice && (view !== 'notes' || step.choiceNote)) {
      if (block.length > 1) block.push('');
      block.push(`**Chose:** ${step.choice.text}`);
      if (step.skipped.length) block.push(`*Skipped:* ${step.skipped.join(' · ')}`);
      if (step.choiceNote && view !== 'choices') block.push(quote('Note on this decision', step.choiceNote));
    }
    while (block[block.length - 1] === '') block.pop();
    out.push('', ...block);
  });
  return out.join('\n') + '\n';
}

export function exportFileName(run: Run, kind: 'json' | 'md'): string {
  return `${run.storyId}_${slug(run.name)}.${kind === 'json' ? 'path.json' : 'md'}`;
}

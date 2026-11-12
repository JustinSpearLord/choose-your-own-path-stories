import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapSceneDetail, runProgress, storyMap } from '../../src/engine/graph';
import {
  canChoose,
  choose,
  currentStep,
  endingIds,
  endingsFound,
  noteCount,
  rewind,
  setChoiceNote,
  setPassageNote,
  startRun,
} from '../../src/engine/run';
import type { Run } from '../../src/engine/types';
import { exportFileName, buildPathFile, pathMarkdown } from '../../src/export/path';
import type { Story } from '../../src/format/types';
import { applyUpdateToRuns, compareVersions, planUpdate } from '../../src/import/update';
import { AI_PROMPT } from '../../src/import/prompt';

const ROOT = join(__dirname, '..', '..');
const story = JSON.parse(readFileSync(join(ROOT, 'samples/lantern_road.quest.json'), 'utf8')) as Story;
const T = (n: number) => new Date(Date.UTC(2026, 10, 8, 13, n)).toISOString();

/** Plays the given choice indexes from the start. */
function play(indexes: number[], id = 'run-a', s: Story = story): Run {
  let run = startRun(s, { runId: id, now: T(0), name: 'Stealth run' });
  indexes.forEach((index, i) => {
    run = choose(run, s, index, { now: T(i + 1) });
  });
  return run;
}

/** A list of choice indexes that reaches each ending, found by walking the story. */
function pathsToEndings(s: Story): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const queue: { id: string; path: number[] }[] = [{ id: s.start, path: [] }];
  const seen = new Set<string>();
  while (queue.length) {
    const { id, path } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const scene = s.scenes[id];
    if (scene.ending) out.set(id, path);
    (scene.choices ?? []).forEach((c, i) => queue.push({ id: c.to, path: [...path, i] }));
  }
  return out;
}

describe('runs', () => {
  it('starts at the start scene with a snapshot', () => {
    const run = startRun(story, { runId: 'r', now: T(0) });
    expect(run.steps).toHaveLength(1);
    expect(run.status).toBe('active');
    expect(run.isCurrent).toBe(true);
    const step = currentStep(run);
    expect(step.sceneId).toBe('road');
    expect(step.snapshot.title).toBe('The Lantern Road');
    expect(step.snapshot.choices).toHaveLength(2);
    expect(step.snapshot.speakers.wren.name).toBe('Wren');
    expect(step.snapshot.prompt).toBeTruthy();
  });

  it('records the choice, the skipped choices and the decision note', () => {
    const run = choose(startRun(story, { now: T(0) }), story, 1, { now: T(1), note: ' why not ' });
    expect(run.steps[0].choice).toEqual({ index: 1, text: 'Relight this lantern before going on', to: 'relight' });
    expect(run.steps[0].skipped).toEqual(['Follow the dark lanterns to the river']);
    expect(run.steps[0].choiceNote).toBe('why not');
    expect(currentStep(run).sceneId).toBe('relight');
    expect(canChoose(run)).toBe(true);
  });

  it('reaches every one of the 6 endings and finishes the run', () => {
    const paths = pathsToEndings(story);
    expect(paths.size).toBe(6);
    expect([...paths.keys()].sort()).toEqual(endingIds(story).sort());
    for (const [ending, path] of paths) {
      const run = play(path);
      expect(run.status, ending).toBe('finished');
      expect(run.endingSceneId).toBe(ending);
      expect(run.finishedAt).toBeTruthy();
      expect(canChoose(run)).toBe(false);
      expect(() => choose(run, story, 0)).toThrow();
    }
  });

  it('sets and deletes notes; an empty text deletes', () => {
    let run = startRun(story, { now: T(0) });
    run = setPassageNote(run, 0, 2, 'second');
    run = setPassageNote(run, 0, 0, 'first');
    expect(run.steps[0].notes.map((n) => n.passage)).toEqual([0, 2]);
    run = setPassageNote(run, 0, 0, 'first, edited');
    expect(run.steps[0].notes).toHaveLength(2);
    run = setChoiceNote(run, 0, 'decide');
    expect(noteCount(run)).toBe(3);
    run = setPassageNote(run, 0, 0, '   ');
    run = setChoiceNote(run, 0, '');
    expect(noteCount(run)).toBe(1);
    expect(run.steps[0].choiceNote).toBeUndefined();
  });

  it('uses the previous scene art when a scene sets none', () => {
    const s: Story = JSON.parse(JSON.stringify(story));
    delete s.scenes.relight.art;
    s.scenes.road.art = 'forest';
    const run = choose(startRun(s), s, 1);
    expect(currentStep(run).snapshot.art).toBe('forest');
  });
});

describe('rewind', () => {
  it('creates a new run and leaves the old one exactly as it was', () => {
    let run = play([0, 0, 1, 0]); // road > hut > ferry > reeds > end-silent
    run = setPassageNote(run, 2, 0, 'Light as a resource?');
    expect(run.status).toBe('finished');
    const before = JSON.stringify(run);
    const next = rewind(run, 2, { runId: 'run-b', now: T(30), story });
    expect(JSON.stringify(run)).toBe(before);

    expect(next.runId).toBe('run-b');
    expect(next.parentRunId).toBe('run-a');
    expect(next.status).toBe('active');
    expect(next.isCurrent).toBe(true);
    expect(next.steps).toHaveLength(3);
    expect(next.steps[0].choice).toEqual(run.steps[0].choice);
    expect(next.steps[2].choice).toBeUndefined();
    expect(next.steps[2].skipped).toEqual([]);
    expect(next.steps[2].notes[0].text).toBe('Light as a resource?');
    expect(canChoose(next)).toBe(true);
    const replay = choose(next, story, 0);
    expect(currentStep(replay).sceneId).toBe('jetty');
  });

  it('refuses to rewind to an ending', () => {
    const run = play([0, 0, 1, 0]);
    expect(() => rewind(run, 4)).toThrow();
  });
});

describe('endings and map', () => {
  const a = play([0, 0, 1, 0], 'a'); // end-silent
  const b = { ...play([1, 1], 'b'), updatedAt: T(50) }; // road > relight > end-village

  it('lists endings found with the first date', () => {
    expect(endingsFound([startRun(story)])).toEqual([]);
    const found = endingsFound([a, b, { ...a, runId: 'a2', finishedAt: T(59) }]);
    expect(found.map((e) => e.sceneId).sort()).toEqual(['end-silent', 'end-village']);
    expect(found.find((e) => e.sceneId === 'end-silent')!.runId).toBe('a');
    expect(found.find((e) => e.sceneId === 'end-silent')!.title).toBe('The Silent Landing');
  });

  it('is locked until an ending is found', () => {
    expect(storyMap(story, [startRun(story)]).locked).toBe(true);
    expect(storyMap(story, []).nodes).toEqual([]);
  });

  it('shows both paths, ? for untaken choices, and never names unvisited scenes', () => {
    const map = storyMap(story, [a, b]);
    expect(map.locked).toBe(false);
    const visited = new Set([...a.steps, ...b.steps].map((s) => s.sceneId));
    const named = map.nodes.filter((n) => n.kind !== 'unknown');
    expect(new Set(named.map((n) => n.sceneId))).toEqual(visited);
    expect(map.seen).toBe(visited.size);
    // b is the latest run
    expect(map.latestRunId).toBe('b');
    expect(map.edges.filter((e) => e.kind === 'latest').map((e) => `${e.from}>${e.to}`).sort()).toEqual([
      'relight>end-village',
      'road>relight',
    ]);
    expect(map.edges.filter((e) => e.kind === 'other')).toHaveLength(4);
    // untaken: relight(1: hut), hut(2), ferry(2), reeds(1)
    const unknown = map.nodes.filter((n) => n.kind === 'unknown');
    expect(unknown).toHaveLength(6);
    expect(map.unexplored).toBe(6);
    for (const n of unknown) {
      expect(n.sceneId).toBeUndefined();
      expect(n.title).toBeUndefined();
    }
    const text = JSON.stringify(map);
    for (const id of Object.keys(story.scenes)) {
      if (!visited.has(id)) {
        expect(text.includes(`"${id}"`), id).toBe(false);
        expect(text.includes(story.scenes[id].title ?? '\u0000'), id).toBe(false);
      }
    }
    // layered top-down by depth from start
    const node = (id: string) => map.nodes.find((n) => n.sceneId === id)!;
    expect(node('road').depth).toBe(0);
    expect(node('hut').y).toBeGreaterThan(node('road').y);
    expect(node('end-silent').kind).toBe('ending');
  });

  it('gives the detail and rewind point for a tapped scene', () => {
    const map = storyMap(story, [a, b]);
    const detail = mapSceneDetail(story, [a, b], 'ferry', map)!;
    expect(detail.choices.map((c) => c.taken)).toEqual([false, true, false]);
    expect(detail.rewind).toEqual({ runId: 'a', stepIndex: 2 });
    expect(mapSceneDetail(story, [a, b], 'abbess', map)).toBeNull();
  });

  it('estimates progress', () => {
    expect(runProgress(startRun(story), story)).toBe(0);
    expect(runProgress(a, story)).toBe(1);
    const mid = play([0, 0]);
    expect(runProgress(mid, story)).toBeGreaterThan(0);
    expect(runProgress(mid, story)).toBeLessThan(1);
  });
});

describe('export', () => {
  let run = play([0, 0, 1, 0]);
  run = setPassageNote(run, 2, 0, 'Light as a resource?');
  run = setChoiceNote(run, 2, 'Silent path felt best.');

  it('.path.json matches the format in the spec', () => {
    const file = buildPathFile(run, story.title);
    expect(file.format).toBe('quest-path/1');
    expect(file.story).toEqual({ id: 'lantern-road', title: 'The Lantern Road', version: '1.0' });
    expect(file.name).toBe('Stealth run');
    expect(file.started).toBe('2026-11-08T13:00:00Z');
    expect(file.finished).toBe('2026-11-08T13:04:00Z');
    expect(file.ending).toEqual({ scene: 'end-silent', title: 'The Silent Landing' });
    expect(file.steps).toHaveLength(5);
    expect(file.steps[2]).toEqual({
      scene: 'ferry',
      notes: [{ passage: 0, text: 'Light as a resource?' }],
      choice: { index: 1, text: 'Douse your lantern and drift in', to: 'reeds' },
      skipped: ['Land the ferry at the jetty', 'Make Maddox tell you what he knows'],
      choiceNote: 'Silent path felt best.',
    });
    expect(file.steps[4]).toEqual({ scene: 'end-silent', notes: [] });
    expect(Object.keys(file)).toEqual(['format', 'story', 'name', 'started', 'finished', 'ending', 'steps']);
  });

  it('an unfinished run omits finished and ending, and its last step has no choice', () => {
    const file = buildPathFile(play([0, 0]), story.title);
    expect('finished' in file).toBe(false);
    expect('ending' in file).toBe(false);
    expect(file.steps[file.steps.length - 1].choice).toBeUndefined();
  });

  it('.md matches the structure of the example', () => {
    const md = pathMarkdown(run, story.title, 'full');
    const lines = md.split('\n');
    expect(lines[0]).toBe('# The Lantern Road: Stealth run');
    expect(lines[1]).toMatch(/^Ending: The Silent Landing · 4 choices · 2 notes · Nov \d+, 2026$/);
    expect(md).toContain('\n## 3. Ferry crossing\n');
    const block = md.slice(md.indexOf('## 3. Ferry crossing'), md.indexOf('## 4.'));
    expect(block).toMatch(/^## 3\. Ferry crossing\nThe ferry groans .*\n> Note: Light as a resource\?\n/);
    expect(block).toContain(
      '\n**Chose:** Douse your lantern and drift in\n*Skipped:* Land the ferry at the jetty · Make Maddox tell you what he knows\n> Note on this decision: Silent path felt best.\n',
    );
    expect(md).toContain('**The end:** The Silent Landing');
  });

  it('the tabs control how much goes into the text file', () => {
    const choices = pathMarkdown(run, story.title, 'choices');
    expect(choices).not.toContain('The ferry groans');
    expect(choices).not.toContain('> Note');
    expect(choices.match(/\*\*Chose:\*\*/g)).toHaveLength(4);
    const notes = pathMarkdown(run, story.title, 'notes');
    expect(notes.match(/^## /gm)).toHaveLength(1);
    expect(notes).toContain('> Note: Light as a resource?');
    expect(notes).toContain('> Note on this decision: Silent path felt best.');
  });

  it('names files <story-id>_<run-name-slug>', () => {
    expect(exportFileName(run, 'json')).toBe('lantern-road_stealth-run.path.json');
    expect(exportFileName(run, 'md')).toBe('lantern-road_stealth-run.md');
  });
});

describe('updates', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('1.10', '1.9')).toBe(1);
    expect(compareVersions('1.0', '1')).toBe(0);
    expect(compareVersions(undefined, '0')).toBe(0);
    expect(compareVersions(undefined, '0.1')).toBe(-1);
    expect(compareVersions('2', '10')).toBe(-1);
  });

  const edited = (): Story => {
    const s: Story = JSON.parse(JSON.stringify(story));
    s.version = '1.1';
    s.scenes.ferry.text[0] = 'The ferry creaks. (rewritten)';
    return s;
  };

  it('says "already have" only for the same version and content', () => {
    const none = new Map<string, Uint8Array>();
    const same = planUpdate({ story, images: none }, { story: JSON.parse(JSON.stringify(story)), images: none }, [], null);
    expect(same.identical).toBe(true);
    const plan = planUpdate({ story, images: none }, { story: edited(), images: none }, [], null);
    expect(plan.identical).toBe(false);
    expect(plan.direction).toBe('newer');
  });

  it('keeps progress when the current scene still exists, moving notes on rewritten passages', () => {
    let run = play([0, 0]); // at ferry
    run = setPassageNote(run, 2, 0, 'on the rewritten passage');
    run = setPassageNote(run, 2, 1, 'on an unchanged passage');
    const finished = play([1, 1], 'done');
    const next = edited();
    const plan = planUpdate({ story, images: new Map() }, { story: next, images: new Map() }, [run, finished], null);
    expect(plan.effects[0].title).toContain('You continue at Scene 3');
    expect(plan.effects.some((e) => e.title.startsWith('1 note may have moved'))).toBe(true);
    expect(plan.effects.some((e) => e.title.includes('1 saved path stays readable'))).toBe(true);

    const changed = applyUpdateToRuns([run, finished], next, T(40));
    expect(changed).toHaveLength(1);
    const step = currentStep(changed[0]);
    expect(changed[0].status).toBe('active');
    expect(changed[0].storyVersion).toBe('1.1');
    expect(step.snapshot.passages[0]).toBe('The ferry creaks. (rewritten)');
    expect(step.notes).toEqual([
      expect.objectContaining({ passage: null, text: 'on the rewritten passage' }),
      expect.objectContaining({ passage: 1, text: 'on an unchanged passage' }),
    ]);
    // earlier steps keep the text that was played
    expect(changed[0].steps[0]).toEqual(run.steps[0]);
  });

  it('marks the run left when its scene is gone', () => {
    const run = play([0, 0]);
    const next = edited();
    delete next.scenes.ferry;
    const plan = planUpdate({ story, images: new Map() }, { story: next, images: new Map() }, [run], null);
    expect(plan.effects[0].title).toBe('You start over.');
    const [changed] = applyUpdateToRuns([run], next);
    expect(changed.status).toBe('left');
    expect(changed.isCurrent).toBe(false);
    expect(changed.steps).toEqual(run.steps);
  });
});

describe('the AI prompt', () => {
  it('is the exact prompt from docs/story-format.md', () => {
    const doc = readFileSync(join(ROOT, 'docs/story-format.md'), 'utf8').replace(/\r\n/g, '\n');
    expect(doc).toContain('```text\n' + AI_PROMPT + '\n```');
  });
});

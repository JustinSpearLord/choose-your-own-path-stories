// Graph helpers over a story and its runs: progress, and the story map.
import type { Story, Tone } from '../format/types';
import { currentStep } from './run';
import type { Run } from './types';

/** The fewest choices from each scene to any ending. Scenes that can't reach one are left out. */
export function distanceToEnding(story: Story): Map<string, number> {
  const dist = new Map<string, number>();
  const incoming = new Map<string, string[]>();
  for (const [id, scene] of Object.entries(story.scenes)) {
    if (scene.ending) dist.set(id, 0);
    for (const c of scene.choices ?? []) {
      if (!incoming.has(c.to)) incoming.set(c.to, []);
      incoming.get(c.to)!.push(id);
    }
  }
  let frontier = [...dist.keys()];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const from of incoming.get(id) ?? []) {
        if (!dist.has(from)) {
          dist.set(from, dist.get(id)! + 1);
          next.push(from);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

/** A rough 0..1 progress for a run: choices made over choices made plus the shortest way out. */
export function runProgress(run: Run, story: Story): number {
  if (run.status === 'finished') return 1;
  const made = run.steps.length - 1;
  const left = distanceToEnding(story).get(currentStep(run).sceneId);
  if (left === undefined) return made > 0 ? 0.5 : 0;
  return made + left === 0 ? 0 : made / (made + left);
}

export interface MapNode {
  id: string;
  kind: 'scene' | 'ending' | 'unknown';
  /** Set for visited scenes only. Unvisited scenes are never named. */
  sceneId?: string;
  title?: string;
  tone?: Tone;
  /** 1, 2, 3… in the order scenes were first reached; endings and unknowns have none. */
  number?: number;
  depth: number;
  x: number;
  y: number;
  inLatest: boolean;
}

export interface MapEdge {
  from: string;
  to: string;
  choiceIndex: number;
  kind: 'latest' | 'other' | 'unknown';
}

export interface MapRunInfo {
  runId: string;
  name: string;
  endingTitle?: string;
  latest: boolean;
}

export interface StoryMap {
  /** The map stays locked until at least one ending has been found. */
  locked: boolean;
  nodes: MapNode[];
  edges: MapEdge[];
  width: number;
  height: number;
  seen: number;
  total: number;
  unexplored: number;
  latestRunId?: string;
  runs: MapRunInfo[];
}

export interface MapSceneDetail {
  sceneId: string;
  title: string;
  number?: number;
  isEnding: boolean;
  choices: { index: number; text: string; taken: boolean; takenInLatest: boolean }[];
  notes: { runId: string; runName: string; text: string }[];
  /** The best run and step to rewind from: the latest run that decided here. */
  rewind?: { runId: string; stepIndex: number };
  seenIn: string[];
}

export const MAP_COL = 72;
export const MAP_ROW = 62;
const MAP_PAD = 36;
const MAP_MIN_WIDTH = 346;

function latestRun(runs: Run[]): Run | undefined {
  return [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/**
 * Builds the story map from every run of one story: the scenes visited, the edges taken, and a "?"
 * for each choice of a visited scene that no run has taken. What lies past a "?" stays hidden.
 */
export function storyMap(story: Story, runs: Run[]): StoryMap {
  const locked = !runs.some((r) => r.status === 'finished' && r.endingSceneId);
  const latest = latestRun(runs);
  const total = Object.keys(story.scenes).length;
  const info: MapRunInfo[] = runs.map((r) => ({
    runId: r.runId,
    name: r.name,
    ...(r.status === 'finished' ? { endingTitle: currentStep(r).snapshot.ending?.title } : {}),
    latest: r.runId === latest?.runId,
  }));
  const empty: StoryMap = {
    locked,
    nodes: [],
    edges: [],
    width: MAP_MIN_WIDTH,
    height: 120,
    seen: 0,
    total,
    unexplored: 0,
    latestRunId: latest?.runId,
    runs: info,
  };
  if (locked || runs.length === 0) return empty;

  // What was seen: scenes (with the newest snapshot of each) and the choices taken from them.
  interface Seen {
    title: string;
    choices: { text: string; to: string }[];
    ending?: { title: string; tone: Tone };
    at: string;
    inLatest: boolean;
    taken: Map<number, { to: string; latest: boolean }>;
  }
  const seen = new Map<string, Seen>();
  const order: string[] = [];
  const ordered = [...runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const run of ordered) {
    const isLatest = run.runId === latest?.runId;
    for (const step of run.steps) {
      let s = seen.get(step.sceneId);
      if (!s) {
        s = { title: '', choices: [], at: '', inLatest: false, taken: new Map() };
        seen.set(step.sceneId, s);
        order.push(step.sceneId);
      }
      if (step.enteredAt >= s.at) {
        s.at = step.enteredAt;
        s.title = step.snapshot.title;
        s.choices = step.snapshot.choices;
        s.ending = step.snapshot.ending;
      }
      if (isLatest) s.inLatest = true;
      if (step.choice) {
        const prev = s.taken.get(step.choice.index);
        s.taken.set(step.choice.index, { to: step.choice.to, latest: isLatest || !!prev?.latest });
      }
    }
  }
  // Prefer the installed story's own choices when the scene still exists.
  for (const [id, s] of seen) {
    const scene = story.scenes[id];
    if (scene?.choices && scene.choices.length >= s.choices.length) {
      s.choices = scene.choices.map((c) => ({ text: c.text, to: c.to }));
    }
  }

  const root = seen.has(story.start) ? story.start : order[0];
  const unknownId = (from: string, index: number) => `?${from}#${index}`;

  // Depth by breadth-first walk over the edges taken.
  const depth = new Map<string, number>([[root, 0]]);
  let frontier = [root];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const { to } of seen.get(id)!.taken.values()) {
        if (seen.has(to) && !depth.has(to)) {
          depth.set(to, depth.get(id)! + 1);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  for (const id of order) if (!depth.has(id)) depth.set(id, 0);

  // Left-to-right order inside a layer: a depth-first walk following choices in the order written.
  const rank: string[] = [];
  const placed = new Set<string>();
  const walk = (id: string) => {
    if (placed.has(id)) return;
    placed.add(id);
    rank.push(id);
    const s = seen.get(id)!;
    s.choices.forEach((_, index) => {
      const taken = s.taken.get(index);
      if (taken && seen.has(taken.to)) walk(taken.to);
      else if (!taken) rank.push(unknownId(id, index));
    });
  };
  walk(root);
  for (const id of order) walk(id);

  const layers = new Map<number, string[]>();
  const nodeDepth = (id: string): number => {
    if (!id.startsWith('?')) return depth.get(id)!;
    return depth.get(id.slice(1, id.lastIndexOf('#')))! + 1;
  };
  for (const id of rank) {
    const d = nodeDepth(id);
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  }
  const widest = Math.max(...[...layers.values()].map((l) => l.length));
  const maxDepth = Math.max(...layers.keys());
  const width = Math.max(MAP_MIN_WIDTH, widest * MAP_COL + MAP_PAD);
  const height = maxDepth * MAP_ROW + MAP_PAD * 2 + 26;

  const numbers = new Map<string, number>();
  let n = 0;
  for (const id of rank) {
    if (!id.startsWith('?') && !seen.get(id)!.ending) numbers.set(id, ++n);
  }

  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  for (const [d, ids] of layers) {
    ids.forEach((id, i) => {
      const x = Math.round(width / 2 + (i - (ids.length - 1) / 2) * MAP_COL);
      const y = MAP_PAD + d * MAP_ROW;
      if (id.startsWith('?')) {
        nodes.push({ id, kind: 'unknown', depth: d, x, y, inLatest: false });
        return;
      }
      const s = seen.get(id)!;
      nodes.push({
        id,
        kind: s.ending ? 'ending' : 'scene',
        sceneId: id,
        title: s.ending?.title ?? s.title,
        ...(s.ending ? { tone: s.ending.tone } : {}),
        ...(numbers.has(id) ? { number: numbers.get(id) } : {}),
        depth: d,
        x,
        y,
        inLatest: s.inLatest,
      });
    });
  }
  let unexplored = 0;
  for (const [id, s] of seen) {
    s.choices.forEach((_, index) => {
      const taken = s.taken.get(index);
      if (taken && seen.has(taken.to)) {
        edges.push({ from: id, to: taken.to, choiceIndex: index, kind: taken.latest ? 'latest' : 'other' });
      } else if (!taken) {
        unexplored += 1;
        edges.push({ from: id, to: unknownId(id, index), choiceIndex: index, kind: 'unknown' });
      }
    });
  }

  return { ...empty, nodes, edges, width, height, seen: seen.size, unexplored };
}

/** Everything the map shows when a visited scene is tapped. */
export function mapSceneDetail(story: Story, runs: Run[], sceneId: string, map: StoryMap): MapSceneDetail | null {
  const node = map.nodes.find((nd) => nd.sceneId === sceneId);
  if (!node) return null;
  const latestId = map.latestRunId;
  const byNewest = [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  let choices: { text: string }[] = story.scenes[sceneId]?.choices ?? [];
  const taken = new Set<number>();
  const takenLatest = new Set<number>();
  const notes: MapSceneDetail['notes'] = [];
  const seenIn: string[] = [];
  let rewindAt: MapSceneDetail['rewind'];
  for (const run of byNewest) {
    let seenHere = false;
    run.steps.forEach((step, stepIndex) => {
      if (step.sceneId !== sceneId) return;
      seenHere = true;
      if (choices.length === 0) choices = step.snapshot.choices;
      for (const note of step.notes) notes.push({ runId: run.runId, runName: run.name, text: note.text });
      if (step.choiceNote) notes.push({ runId: run.runId, runName: run.name, text: step.choiceNote });
      if (step.choice) {
        taken.add(step.choice.index);
        if (run.runId === latestId) takenLatest.add(step.choice.index);
        if (!rewindAt) rewindAt = { runId: run.runId, stepIndex };
      }
    });
    if (seenHere) seenIn.push(run.name);
  }
  return {
    sceneId,
    title: node.title ?? sceneId,
    number: node.number,
    isEnding: node.kind === 'ending',
    choices: choices.map((c, index) => ({
      index,
      text: c.text,
      taken: taken.has(index),
      takenInLatest: takenLatest.has(index),
    })),
    notes,
    ...(rewindAt ? { rewind: rewindAt } : {}),
    seenIn,
  };
}

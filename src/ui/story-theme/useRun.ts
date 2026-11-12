import { useCallback, useEffect, useRef, useState } from 'react';
import { addPlayTime } from '../../engine/run';
import type { Run } from '../../engine/types';
import { type ResolvedTheme, resolveTheme } from '../../format/theme';
import type { PlayerLook, Story } from '../../format/types';
import type { StoryRecord } from '../../storage/db';
import { getLook, getRun, getStory, listRuns, saveRun } from '../../storage/repo';

export interface RunBundle {
  run: Run;
  record: StoryRecord;
  story: Story;
  look: PlayerLook | null;
  theme: ResolvedTheme;
  /** Every run of the same story, this one included. */
  runs: Run[];
  /** Saves the run and shows the new state. Every action goes through here, so nothing is lost. */
  save: (next: Run) => Promise<void>;
  reload: () => void;
}

const IDLE_CAP_MS = 5 * 60 * 1000;

/**
 * Loads a run with its story and look. With `timed`, time spent on the screen while it is visible
 * is added to the run's play time.
 */
export function useRun(runId: string, timed = false): { bundle: RunBundle | null; missing: boolean } {
  const [state, setState] = useState<Omit<RunBundle, 'save' | 'reload' | 'theme' | 'story'> | null>(null);
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);
  const latest = useRef<Run | null>(null);
  const clock = useRef(0);

  useEffect(() => {
    let live = true;
    setMissing(false);
    void (async () => {
      const run = await getRun(runId);
      const record = run ? await getStory(run.storyId) : undefined;
      if (!live) return;
      if (!run || !record) {
        setState(null);
        setMissing(true);
        return;
      }
      const [look, runs] = await Promise.all([getLook(record.id), listRuns(record.id)]);
      if (!live) return;
      latest.current = run;
      clock.current = performance.now();
      setState({ run, record, look, runs });
    })();
    return () => {
      live = false;
    };
  }, [runId, tick]);

  const fold = useCallback(
    (run: Run): Run => {
      if (!timed || run.status !== 'active') return run;
      const now = performance.now();
      const ms = document.visibilityState === 'visible' ? Math.min(now - clock.current, IDLE_CAP_MS) : 0;
      clock.current = now;
      return addPlayTime(run, ms);
    },
    [timed],
  );

  const save = useCallback(
    async (next: Run) => {
      const run = fold(next);
      latest.current = run;
      setState((s) => (s ? { ...s, run, runs: s.runs.map((r) => (r.runId === run.runId ? run : r)) } : s));
      await saveRun(run);
    },
    [fold],
  );

  // Bank the play time when the app is hidden or the screen is left.
  useEffect(() => {
    if (!timed) return;
    const bank = () => {
      const run = latest.current;
      if (!run || run.runId !== runId) return;
      const folded = fold(run);
      if (folded !== run) {
        latest.current = folded;
        void saveRun(folded);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') bank();
      else clock.current = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', bank);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', bank);
      bank();
    };
  }, [timed, fold, runId]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  if (!state) return { bundle: null, missing };
  const story = state.record.story;
  return {
    bundle: { ...state, story, theme: resolveTheme(story.theme, state.look), save, reload },
    missing,
  };
}

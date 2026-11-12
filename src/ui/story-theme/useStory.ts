import type { Run } from '../../engine/types';
import { type ResolvedTheme, resolveTheme } from '../../format/theme';
import type { PlayerLook, Story } from '../../format/types';
import type { StoryRecord } from '../../storage/db';
import { getLook, getStory, listRuns } from '../../storage/repo';
import { useLoad } from '../hooks';

export interface StoryBundle {
  record: StoryRecord;
  story: Story;
  look: PlayerLook | null;
  theme: ResolvedTheme;
  runs: Run[];
}

/** Loads a story with its look and all of its runs. */
export function useStory(id: string): { bundle: StoryBundle | null; missing: boolean; reload: () => void } {
  const { data, loading, reload } = useLoad(
    async () => ({ record: await getStory(id), look: await getLook(id), runs: await listRuns(id) }),
    [id],
  );
  if (loading || !data) return { bundle: null, missing: false, reload };
  if (!data.record) return { bundle: null, missing: true, reload };
  const story = data.record.story;
  return {
    bundle: { record: data.record, story, look: data.look, theme: resolveTheme(story.theme, data.look), runs: data.runs },
    missing: false,
    reload,
  };
}

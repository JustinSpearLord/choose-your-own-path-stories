// IndexedDB schema (Dexie). Everything the app keeps lives here, on the device.
import Dexie, { type Table } from 'dexie';
import type { Run } from '../engine/types';
import type { PlayerLook, Story } from '../format/types';

export interface StoryRecord {
  id: string;
  version: string;
  title: string;
  author: string;
  summary: string;
  story: Story;
  isPackage: boolean;
  importedAt: string;
  updatedAt: string;
  sizeBytes: number;
  sourceUrl?: string;
}

export interface ImageRecord {
  storyId: string;
  path: string;
  /** The image file's bytes. Kept as bytes rather than a Blob: it stores reliably in every browser. */
  data: Uint8Array;
  type: string;
  width: number;
  height: number;
}

export interface LookRecord extends PlayerLook {
  storyId: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
}

export class QuestDb extends Dexie {
  stories!: Table<StoryRecord, string>;
  images!: Table<ImageRecord, [string, string]>;
  looks!: Table<LookRecord, string>;
  runs!: Table<Run, string>;
  meta!: Table<MetaRecord, string>;

  constructor(name = 'quest-journal') {
    super(name);
    this.version(1).stores({
      stories: 'id',
      images: '[storyId+path], storyId',
      looks: 'storyId',
      runs: 'runId, storyId',
      meta: 'key',
    });
  }
}

export let db = new QuestDb();

/** Swaps the database, for tests. */
export function setDatabase(next: QuestDb): void {
  db = next;
}

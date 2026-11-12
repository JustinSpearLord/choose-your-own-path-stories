// The story file being imported, held in memory between the Import, Choose a look and New version screens.
import { useSyncExternalStore } from 'react';
import type { ParsedFile } from '../format/parse';

export interface PendingImport {
  file: ParsedFile;
  /** Set when the file came from an import link. */
  sourceUrl?: string;
}

let pending: PendingImport | null = null;
const listeners = new Set<() => void>();

export function getPending(): PendingImport | null {
  return pending;
}

export function setPending(next: PendingImport | null): void {
  pending = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePending(): PendingImport | null {
  return useSyncExternalStore(subscribe, getPending);
}

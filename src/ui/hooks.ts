import { useCallback, useEffect, useRef, useState } from 'react';

export interface Loaded<T> {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

/** Runs an async read and re-runs it when `deps` change or `reload` is called. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: unknown }>({
    data: undefined,
    loading: true,
    error: undefined,
  });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let live = true;
    fnRef.current().then(
      (data) => live && setState({ data, loading: false, error: undefined }),
      (error) => live && setState({ data: undefined, loading: false, error }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Sets the document title for the current screen. */
export function useTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Quest Journal` : 'Quest Journal';
  }, [title]);
}

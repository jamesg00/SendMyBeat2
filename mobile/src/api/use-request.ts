import { useCallback, useEffect, useRef, useState } from 'react';

type State<T> = { data: T | null; error: string | null; loading: boolean };

// Minimal loader for screen data. `fn` runs on mount and again after reload() or refresh().
export function useRequest<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [run, setRun] = useState({ n: 0, quiet: false });
  const waiting = useRef<(() => void)[]>([]);

  useEffect(() => {
    let alive = true;
    const done = waiting.current.splice(0);
    fn()
      .then(
        (data) => alive && setState({ data, error: null, loading: false }),
        (e: unknown) => {
          if (!alive) return;
          const error = e instanceof Error ? e.message : 'Something went wrong';
          // A failed background refresh keeps what's on screen.
          setState((s) => (run.quiet && s.data ? { ...s, loading: false } : { ...s, error, loading: false }));
        },
      )
      .finally(() => done.forEach((resolve) => resolve()));
    return () => {
      alive = false;
    };
    // fn is an endpoint function; reruns are driven by reload() and refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // Stable identities so screens can reload on focus without effect loops.
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setRun((r) => ({ n: r.n + 1, quiet: false }));
  }, []);

  /** Fetch again while keeping the current data on screen; resolves once it lands (for pull to refresh). */
  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiting.current.push(resolve);
        setRun((r) => ({ n: r.n + 1, quiet: true }));
      }),
    [],
  );

  const setData = useCallback((update: (cur: T | null) => T) => setState((s) => ({ ...s, data: update(s.data) })), []);

  return { ...state, setData, reload, refresh };
}

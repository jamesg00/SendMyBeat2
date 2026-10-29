import { useEffect, useState } from 'react';

type State<T> = { data: T | null; error: string | null; loading: boolean };

// Minimal loader for screen data. `fn` runs on mount and again after reload().
export function useRequest<T>(fn: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (e: unknown) =>
        alive && setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Something went wrong', loading: false })),
    );
    return () => {
      alive = false;
    };
    // fn is an endpoint function; reruns are driven by reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  const reload = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  };

  const setData = (update: (cur: T | null) => T) => setState((s) => ({ ...s, data: update(s.data) }));

  return { ...state, setData, reload };
}

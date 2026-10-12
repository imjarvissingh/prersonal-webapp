"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface State<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

// Loads data whenever `deps` change and exposes a reload function. The previous
// data stays visible while reloading so the UI doesn't flash.
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]) {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const key = `${JSON.stringify(deps)}#${version}`;

  useEffect(() => {
    let cancelled = false;
    loaderRef.current().then(
      (data) => {
        if (!cancelled) setState({ key, data, error: null });
      },
      (err: unknown) => {
        if (!cancelled) {
          setState((s) => ({ ...s, key, error: err instanceof Error ? err.message : "Something went wrong" }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), []);

  return { data: state.data, error: state.error, loading: state.key !== key, reload, setData };
}

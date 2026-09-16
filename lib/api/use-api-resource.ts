'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ApiResourceOptions<T> = {
  key: string;
  load: () => Promise<T>;
  onSuccess?: (value: T) => void;
};

export function useApiResource<T>({ key, load, onSuccess }: ApiResourceOptions<T>) {
  const loadRef = useRef(load);
  const successRef = useRef(onSuccess);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    loadRef.current = load;
    successRef.current = onSuccess;
  }, [load, onSuccess]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError('');
      loadRef.current()
        .then((value) => {
          if (!active) return;
          setData(value);
          successRef.current?.(value);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu');
        })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [key, revision]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { data, error, loading, refresh } as const;
}

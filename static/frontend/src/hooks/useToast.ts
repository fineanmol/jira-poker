import { useState, useCallback } from 'react';

const DEFAULT_DURATION_MS = 3000;

export interface ToastState {
  message: string | null;
  show: (msg: string, durationMs?: number) => void;
  hide: () => void;
}

export function useToast(): ToastState {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((msg: string, durationMs = DEFAULT_DURATION_MS) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), durationMs);
  }, []);

  const hide = useCallback(() => setMessage(null), []);

  return { message, show, hide };
}

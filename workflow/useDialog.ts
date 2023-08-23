import { Ref, useCallback, useRef } from "../deps/preact.tsx";

export interface UseDialogResult {
  ref: Ref<HTMLDialogElement>;
  open: VoidFunction;
  close: VoidFunction;
  toggle: VoidFunction;
  onOpen: (listener: () => void) => () => void;
}

export const useDialog = (): UseDialogResult => {
  const ref = useRef<HTMLDialogElement>(null);
  const listeners = useRef<Set<() => void>>(new Set());
  const emitChange = useCallback(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, []);

  const open = useCallback(() => {
    ref.current?.showModal?.();
    emitChange();
  }, []);
  const close = useCallback(() => ref.current?.close?.(), []);
  const toggle = useCallback(() => ref.current?.open ? close() : open(), []);

  const onOpen = useCallback((listener: () => void) => {
    listeners.current?.add?.(listener);
    return () => listeners.current?.delete?.(listener);
  }, []);

  return { ref, open, close, toggle, onOpen };
};

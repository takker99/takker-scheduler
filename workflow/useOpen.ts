import { useCallback, useRef, useState } from "../deps/preact.tsx";

export interface UseOpenResult {
  isOpen: boolean;
  open: VoidFunction;
  close: VoidFunction;
  toggle: VoidFunction;
  onOpen: (listener: () => void) => () => void;
}

export const useOpen = (initialState: boolean): UseOpenResult => {
  const listeners = useRef<Set<() => void>>(new Set());
  const [isOpen, setOpend] = useState(initialState);

  const emitChange = useCallback(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, []);
  const open = useCallback(() => {
    setOpend(true);
    emitChange();
  }, []);

  const close = useCallback(() => setOpend(false), []);
  const toggle = useCallback(() =>
    setOpend((state) => {
      if (!state) emitChange();
      return !state;
    }), []);

  const onOpen = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  return { isOpen, open, close, toggle, onOpen };
};

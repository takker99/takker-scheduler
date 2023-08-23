import { Ref, useCallback, useRef } from "../deps/preact.tsx";

export interface UseDialogResult {
  ref: Ref<HTMLDialogElement>;
  open: VoidFunction;
  close: VoidFunction;
  toggle: VoidFunction;
  isOpen: boolean;
}

export const useDialog = (): UseDialogResult => {
  const ref = useRef<HTMLDialogElement>(null);
  const open = useCallback(() => ref.current?.showModal?.(), []);
  const close = useCallback(() => ref.current?.close?.(), []);
  const toggle = useCallback(() => ref.current?.open ? close() : open(), []);

  return { ref, open, close, toggle, isOpen: ref.current?.open ?? false };
};

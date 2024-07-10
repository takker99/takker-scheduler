/** @jsx h */

import {
  ComponentChildren,
  FunctionComponent,
  h,
  Ref,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "../deps/preact.tsx";
import { useStopPropagation } from "./useStopPropagation.ts";

export interface UseDialogResult {
  isOpen: boolean;
  open: VoidFunction;
  close: VoidFunction;
  Dialog: FunctionComponent<{ children?: ComponentChildren }>;
}

export const useDialog = (): UseDialogResult => {
  const [dialogState, setOpen] = useReducer(dialogStateReducer, {
    isOpen: false,
    ref: useRef<HTMLDialogElement>(null),
    prevOverflowY: "",
  });

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const Dialog: FunctionComponent<{ children?: ComponentChildren }> =
    useCallback((
      { children },
    ) => {
      /** dialogクリックではmodalを閉じないようにする */
      const stopPropagation = useStopPropagation();

      useEffect(
        () => {
          dialogState.ref.current?.addEventListener?.("cancel", close);
          return () =>
            dialogState.ref.current?.removeEventListener?.("cancel", close);
        },
        [],
      );

      return (
        <dialog ref={dialogState.ref} onClick={close}>
          {children && (
            <div className="dialog-inner" onClick={stopPropagation}>
              {children}
            </div>
          )}
        </dialog>
      );
    }, []);

  return { isOpen: dialogState.isOpen, open, close, Dialog };
};

interface DialogState {
  isOpen: boolean;
  ref: Ref<HTMLDialogElement>;
  prevOverflowY: string;
}

const dialogStateReducer = (
  state: DialogState,
  isOpen: boolean,
): DialogState => {
  if (isOpen) {
    state.ref.current?.showModal?.();
    const prevOverflowY = !state.isOpen
      ? document.documentElement.style.overflowY
      : state.prevOverflowY;
    document.documentElement.style.overflowY = "hidden";
    return { isOpen: true, prevOverflowY, ref: state.ref };
  }
  state.ref.current?.close?.();
  if (state.prevOverflowY === "") {
    document.documentElement.style.removeProperty("overflow-y");
  } else {
    document.documentElement.style.overflowY = state.prevOverflowY;
  }
  return { isOpen: false, prevOverflowY: "", ref: state.ref };
};

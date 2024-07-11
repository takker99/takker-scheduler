/** @jsx h */

import {
  ComponentChildren,
  FunctionComponent,
  h,
  RefCallback,
  useCallback,
  useMemo,
  useReducer,
} from "../deps/preact.tsx";
import { useStopPropagation } from "./useStopPropagation.ts";

export interface UseDialogResult {
  isOpen: boolean;
  open: VoidFunction;
  close: VoidFunction;
  Dialog: FunctionComponent<{ children?: ComponentChildren }>;
}

export const useDialog = (): UseDialogResult => {
  const [dialogState, changeDialogState] = useReducer(dialogStateReducer, {
    isOpen: false,
    prevOverflowY: "",
  });

  const open = useCallback(() => changeDialogState(true), []);
  const close = useCallback(() => changeDialogState(false), []);

  const Dialog: FunctionComponent<{ children?: ComponentChildren }> =
    useCallback((
      { children },
    ) => {
      /** dialogクリックではmodalを閉じないようにする */
      const stopPropagation = useStopPropagation();

      const ref: RefCallback<HTMLDialogElement> = useMemo(
        () => {
          let cleanup: VoidFunction | undefined;
          return (dialog) => {
            if (!dialog) {
              cleanup?.();
              changeDialogState(dialog);
              return;
            }

            const controller = new AbortController();
            dialog.addEventListener("cancel", () => changeDialogState(false), {
              signal: controller.signal,
            });

            cleanup = () => {
              controller.abort();
            };
            changeDialogState(dialog);
          };
        },
        [],
      );

      return (
        <dialog ref={ref} onClick={close}>
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
  dialog?: HTMLDialogElement | null;
  prevOverflowY: string;
}

const dialogStateReducer = (
  state: DialogState,
  isOpen: boolean | HTMLDialogElement | null,
): DialogState => {
  const isOpenNow = state.dialog?.open ?? false;
  if (isOpen instanceof HTMLDialogElement || isOpen === null) {
    return isOpenNow === state.isOpen && isOpen === state.dialog ? state : {
      isOpen: isOpenNow,
      dialog: isOpen,
      prevOverflowY: state.prevOverflowY,
    };
  }
  if (isOpen) {
    state.dialog?.showModal?.();
    const prevOverflowY = !state.isOpen
      ? document.documentElement.style.overflowY
      : state.prevOverflowY;
    document.documentElement.style.overflowY = "hidden";
    return state.isOpen && isOpenNow
      ? state
      : { isOpen: true, prevOverflowY, dialog: state.dialog };
  }
  state.dialog?.close?.();
  if (state.prevOverflowY === "") {
    document.documentElement.style.removeProperty("overflow-y");
  } else {
    document.documentElement.style.overflowY = state.prevOverflowY;
  }
  return !state.isOpen && !isOpenNow
    ? state
    : { isOpen: false, prevOverflowY: "", dialog: state.dialog };
};

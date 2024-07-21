import {
  RefCallback,
  useCallback,
  useMemo,
  useReducer,
} from "../deps/preact.tsx";

export interface UseDialogResult {
  isOpen: boolean;
  open: VoidFunction;
  close: VoidFunction;
  ref: RefCallback<HTMLDialogElement>;
}

export const useDialog = (): UseDialogResult => {
  const [dialogState, changeDialogState] = useReducer(dialogStateReducer, {
    isOpen: false,
    prevOverflowY: "",
  });

  const open = useCallback(() => changeDialogState(true), []);
  const close = useCallback(() => changeDialogState(false), []);

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
        // close `<dialog>` when pressing the Escape key
        dialog.addEventListener("cancel", () => changeDialogState(false), {
          signal: controller.signal,
        });
        //close `<dialog>` when clicking the backdrop
        dialog.addEventListener("click", (e) => {
          if (e.target !== e.currentTarget) {
            e.stopPropagation();
            return;
          }
          changeDialogState(false);
        }, {
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

  return { isOpen: dialogState.isOpen, open, close, ref };
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

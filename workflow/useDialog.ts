import {
  RefCallback,
  useCallback,
  useMemo,
  useReducer,
  useRef,
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
  const dialogStore = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => {
    changeDialogState((prev) => {
      dialogStore?.current?.showModal?.();
      const isOpen = dialogStore?.current?.open ?? false;
      // prevent <html> from scrolling when the dialog is open
      const prevOverflowY = prev.isOpen
        ? prev.prevOverflowY
        : document.documentElement.style.overflowY;
      document.documentElement.style.overflowY = "hidden";
      return { isOpen, prevOverflowY };
    });
  }, []);
  const close = useCallback(() => {
    changeDialogState((prev) => {
      dialogStore?.current?.close?.();
      const isOpen = dialogStore?.current?.open ?? false;
      if (!isOpen) {
        // restore the previous `overflow-y` value
        if (prev.prevOverflowY) {
          document.documentElement.style.overflowY = prev.prevOverflowY;
        } else {
          document.documentElement.style.removeProperty("overflow-y");
        }
        return { isOpen };
      }
      return { isOpen, prevOverflowY: prev.prevOverflowY };
    });
  }, []);

  const ref: RefCallback<HTMLDialogElement> = useMemo(
    () => {
      let cleanup: VoidFunction | undefined;
      return (dialog) => {
        if (!dialog) {
          cleanup?.();
          dialogStore.current = null;
          return;
        }

        const controller = new AbortController();
        // close `<dialog>` when pressing the Escape key
        dialog.addEventListener("cancel", close, {
          signal: controller.signal,
        });
        //close `<dialog>` when clicking the backdrop
        dialog.addEventListener("click", (e) => {
          if (e.target !== e.currentTarget) {
            e.stopPropagation();
            return;
          }
          close();
        }, {
          signal: controller.signal,
        });

        cleanup = () => {
          controller.abort();
        };
        dialogStore.current = dialog;
      };
    },
    [close],
  );

  return { isOpen: dialogState.isOpen, open, close, ref };
};

interface DialogState {
  isOpen: boolean;
  prevOverflowY?: string;
}
type Action = (prev: DialogState) => DialogState;

const dialogStateReducer = (
  state: DialogState,
  action: Action,
): DialogState => {
  const next = action(state);
  return state.isOpen === next.isOpen &&
      state.prevOverflowY === next.prevOverflowY
    ? state
    : !next.isOpen
    ? { isOpen: false }
    : next;
};

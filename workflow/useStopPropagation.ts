import { useCallback } from "../deps/preact.tsx";

/** Hooks for stopping event propagation */
export const useStopPropagation = (): (e: Event) => void =>
  useCallback(
    (e: globalThis.Event) => e.stopPropagation(),
    [],
  );

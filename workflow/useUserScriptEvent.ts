import { useEffect } from "../deps/preact.tsx";
import type { EventName, Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

export const useUserScriptEvent = (
  eventName: EventName,
  callback: () => void,
): void =>
  useEffect(() => {
    scrapbox.on(eventName, callback);
    return () => scrapbox.off(eventName, callback);
  }, []);

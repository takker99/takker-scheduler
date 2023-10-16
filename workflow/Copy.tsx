/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import {
  FunctionComponent,
  h,
  useCallback,
  useState,
} from "../deps/preact.tsx";
import { sleep } from "../deps/scrapbox-std.ts";

/** コピーボタン */
export const Copy: FunctionComponent<{ text: string; title?: string }> = (
  { text, title },
) => {
  const [buttonLabel, setButtonLabel] = useState("\uf0c5");
  const handleClick = useCallback(
    async (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setButtonLabel("Copied");
        await sleep(1000);
        setButtonLabel("\uf0c5");
      } catch (e) {
        alert(`Failed to copy the code block\nError:${e.message}`);
      }
    },
    [text],
  );

  return (
    <button className="copy" title={title ?? "Copy"} onClick={handleClick}>
      {buttonLabel}
    </button>
  );
};

/** @jsxImportSource npm:preact@10 */
import { delay } from "../deps/async.ts";
import {
  FunctionComponent,
  h,
  useCallback,
  useState,
} from "../deps/preact.tsx";

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
        await delay(1000);
        setButtonLabel("\uf0c5");
      } catch (e) {
        alert(
          `Failed to copy the code block\nError:${
            e instanceof Error ? e.message : e
          }`,
        );
        console.error(e);
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

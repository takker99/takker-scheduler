/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { cursor, editor } from "./dom.ts";
import { getDOMFromPoint } from "./node.ts";

export function position() {
  const editorDiv = editor();
  if (!editorDiv) throw Error("#editor must exist.");
  const { top, left } = editorDiv.getBoundingClientRect(); // 基準座標
  const cursorDiv = cursor();
  if (!cursorDiv) throw Error(".cursor must exist.");
  const style = cursorDiv.style;
  const cursorPos = {
    top: parseInt(style.top),
    left: parseInt(style.left),
    height: parseInt(style.height),
  };
  return getDOMFromPoint(
    cursorPos.left + left + 1,
    (cursorPos.top + top) + cursorPos.height / 2,
  );
}

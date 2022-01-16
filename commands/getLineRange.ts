import { caret } from "../lib/caret.ts";

/** 選択範囲に含まれる行かカーソルがいる行を返す */
export function getLineRange() {
  const { selectionRange: { start, end }, selectedText, position } = caret();
  return selectedText === ""
    ? [position.line, position.line]
    : start.line > end.line
    ? [end.line, start.line]
    : [start.line, end.line] as const;
}

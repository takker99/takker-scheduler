import { caret } from "../deps/scrapbox-std-dom.ts";

/** 選択範囲に含まれる行かカーソルがいる行を返す */
export const getLineRange = (): readonly [number, number] => {
  const { selectionRange: { start, end }, selectedText, position } = caret();
  return selectedText === ""
    ? [position.line, position.line]
    : start.line > end.line
    ? [end.line, start.line]
    : [start.line, end.line] as const;
};

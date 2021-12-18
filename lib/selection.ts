/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { getLines, getText } from "./node.ts";
import type { Position } from "./types.ts";

interface ReactInternalInstance {
  return: {
    memoizedProps: {
      range: Range;
    };
  };
}
export interface Range {
  start: Position;
  end: Position;
}
export function range() {
  const selections = document.querySelector(".selections");
  if (!selections) return;

  const reactKey = Object.keys(selections)
    .find((key) => key.startsWith("__reactInternalInstance"));
  if (!reactKey) {
    throw Error(
      "div.selections must has the property whose name starts with `__reactInternalInstance`",
    );
  }
  return ((selections as unknown as Record<string, unknown>)[
    reactKey
  ] as ReactInternalInstance).return.memoizedProps
    .range;
}
export function rangeText() {
  const { start, end } = range() ?? {};
  if (!start || !end) return "";

  return [
    getText(start.line)?.slice?.(start.char),
    ...getLines().map(({ text }) => text).slice(
      start.line + 1,
      end.line,
    ),
    getText(end.line)?.slice?.(0, end.char + 1),
  ].join("\n");
}

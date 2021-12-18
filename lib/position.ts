/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { cursor } from "./dom.ts";
import type { Position } from "./types.ts";

interface ReactInternalInstance {
  return: {
    memoizedProps: {
      position: Position;
    };
  };
}
export function position() {
  const cursorDOM = cursor();
  if (!cursorDOM) return;

  const reactKey = Object.keys(cursorDOM)
    .find((key) => key.startsWith("__reactInternalInstance"));
  if (!reactKey) {
    throw Error(
      "div.cursor must has the property whose name starts with `__reactInternalInstance`",
    );
  }
  return ((cursorDOM as unknown as Record<string, unknown>)[
    reactKey
  ] as ReactInternalInstance).return.memoizedProps.position;
}

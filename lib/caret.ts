/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { textInput } from "./dom.ts";
import type { Position, Range } from "./types.ts";

interface ReactInternalInstance {
  return: {
    return: {
      stateNode: {
        props: {
          position: Position;
          selectedText: string;
          selectionRange: Range;
        };
      };
    };
  };
}
export function caret() {
  const textarea = textInput();
  if (!textarea) {
    throw Error(`#text-input is not found.`);
  }

  const reactKey = Object.keys(textarea)
    .find((key) => key.startsWith("__reactInternalInstance"));
  if (!reactKey) {
    throw Error(
      "div.cursor must has the property whose name starts with `__reactInternalInstance`",
    );
  }
  return ((textarea as unknown as Record<string, unknown>)[
    reactKey
  ] as ReactInternalInstance).return.return.stateNode.props;
}

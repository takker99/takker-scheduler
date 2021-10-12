import { goHead, goLine } from "./motion.ts";
import { press } from "./press.ts";
import { insertText } from "./insertText.ts";
import { range } from "./range.ts";

export function undo(count = 1) {
  for (const _ of range(0, count)) {
    press("z", { ctrlKey: true });
  }
}
export function redo(count = 1) {
  for (const _ of range(0, count)) {
    press("z", { shiftKey: true, ctrlKey: true });
  }
}

export function insertTimestamp(index = 1) {
  for (const _ of range(0, index)) {
    press("t", { altKey: true });
  }
}

export async function insertLine(lineNo, text) {
  await goLine(lineNo);
  goHead();
  press("Enter");
  press("ArrowUp");
  await insertText(text);
}

export async function deleteLines(value, count = 1) {
  if (typeof value === "number") {
    const from = value;
    if (scrapbox.Page.lines.length === from + count) {
      await goLine(from - 1);
      press("ArrowRight", { shiftKey: true });
    } else {
      await goLine(from);
      goHead();
    }
    for (let i = 0; i < count; i++) {
      press("ArrowRight", { shiftKey: true });
      press("End", { shiftKey: true });
    }
    press("ArrowRight", { shiftKey: true });
    press("Delete");
    return;
  }
  if (typeof value === "string" || Array.isArray(value)) {
    const ids = Array.isArray(value) ? value : [value];
    for (const id of ids) {
      await goLine(id);
      press("Home", { shiftKey: true });
      press("Home", { shiftKey: true });
      press("Backspace");
      press("Backspace");
    }
    return;
  }
  throw Error("The type of value must be number | string | string[]: ", value);
}

export async function replaceLine(lineNo, text) {
  await goLine(lineNo);
  press("Home", { shiftKey: true });
  press("Home", { shiftKey: true });
  await insertText(text);
}
export function indentLines(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowRight", { ctrlKey: true });
  }
}
export function deindentLines(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowLeft", { ctrlKey: true });
  }
}
export function moveLines(count) {
  if (count > 0) {
    downLines(count);
  } else {
    upLines(-count);
  }
}
// to行目の後ろに移動させる
export function moveLinesBefore({ from: From, to }) {
  const count = to - From;
  if (count >= 0) {
    downLines(count);
  } else {
    upLines(-count - 1);
  }
}
export function upLines(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowUp", { ctrlKey: true });
  }
}
export function downLines(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowDown", { ctrlKey: true });
  }
}

export function indentBlocks(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowRight", { altKey: true });
  }
}
export function deindentBlocks(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowLeft", { altKey: true });
  }
}
export function moveBlocks(count) {
  if (count > 0) {
    downBlocks(count);
  } else {
    upBlocks(-count);
  }
}
export function upBlocks(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowUp", { altKey: true });
  }
}
export function downBlocks(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowDown", { altKey: true });
  }
}

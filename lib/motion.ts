/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { press } from "./press.ts";
import { mimicClick, mimicHoldDown } from "./pointer.ts";
import {
  getCharDOM,
  getHeadCharDOM,
  getHeadLineDOM,
  getIndentCount,
  getLineCount,
  getLineDOM,
  getLineNo,
  getTailLineDOM,
} from "./node.ts";
import { position } from "./position.ts";
import { isHeightViewable } from "./isHeightViewable.ts";
import { range } from "./range.ts";

export async function focusEnd(holding = 1000) {
  const target = (position().line ?? getHeadLineDOM())
    ?.getElementsByClassName(
      "text",
    )?.[0] as (HTMLDivElement | undefined);
  if (!target) throw Error(".line .target can't be found.");
  if (!isHeightViewable(target)) target.scrollIntoView({ block: "center" });

  const { right, top, height } = target.getBoundingClientRect();
  await mimicHoldDown(target, { X: right + 1, Y: top + height / 2, holding });
}

export function moveLeft(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowLeft");
  }
}
export function moveUp(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowUp");
  }
}
export function moveDown(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowDown");
  }
}
export function moveRight(count = 1) {
  for (const _ of range(0, count)) {
    press("ArrowRight");
  }
}

export function goHeadWithoutBlank() {
  press("End");
  press("Home");
}
export function goEndWithoutBlank() {
  press("End");
  moveLeft(getIndentCount(position()?.line));
}
export function goHead() {
  press("Home");
  press("Home");
}
export function goEnd() {
  press("End");
}

export async function goHeadLine() {
  const target = getHeadLineDOM();
  if (!target) throw Error(".line:first-of-type can't be found.");
  if (!isHeightViewable(target)) target.scrollIntoView({ block: "center" });

  const charDOM = getHeadCharDOM(target);
  if (!charDOM) throw Error(".line:first-of-type .c-0 can't be found.");
  const { left, top } = charDOM.getBoundingClientRect();
  await mimicClick(target, { X: left, Y: top });
}
export async function goLastLine() {
  await _goLine(getTailLineDOM());
}
export async function goLine(value: unknown) {
  await _goLine(getLineDOM(value));
}
async function _goLine(target: HTMLDivElement | undefined) {
  if (!target) throw Error("The target line DOM is failed to find.");
  if (!isHeightViewable(target)) target.scrollIntoView({ block: "center" });

  const { right, top, height } = target.getElementsByClassName("text")[0]
    .getBoundingClientRect();
  await mimicClick(target, { X: right + 1, Y: top + height / 2 });
}
export async function goChar(line: unknown, pos: number) {
  const charDOM = getCharDOM(line, pos);
  if (!charDOM) {
    throw Error(
      `Could not find the char DOM at line: ${getLineNo(line)}, column: ${pos}`,
    );
  }
  if (!isHeightViewable(charDOM)) charDOM.scrollIntoView({ block: "center" });

  const { left, top } = charDOM.getBoundingClientRect();
  await mimicClick(charDOM, { X: left, Y: top });
}
function getVisibleLineCount() {
  const clientHeight = getTailLineDOM()?.clientHeight;
  if (clientHeight === undefined) {
    throw Error("Could not find .line:last-of-type");
  }
  return Math.round(window.innerHeight / clientHeight);
}

export async function scrollHalfUp(count = 1) {
  const lineNo = getLineNo(position().line);
  if (lineNo === undefined) {
    throw Error("Could not detect the present cursor line No.");
  }
  const index = Math.round(
    (lineNo - getVisibleLineCount() / 2) * count,
  );
  await goLine(Math.max(index, 0));
}
export async function scrollHalfDown(count = 1) {
  const lineNo = getLineNo(position().line);
  if (lineNo === undefined) {
    throw Error("Could not detect the present cursor line No.");
  }
  const index = Math.round(
    (lineNo + getVisibleLineCount() / 2) * count,
  );
  await goLine(Math.min(index, getLineCount() - 1));
}
export function scrollUp(count = 1) {
  for (const _ of range(0, count)) {
    press("PageUp");
  }
}
export function scrollDown(count = 1) {
  for (const _ of range(0, count)) {
    press("PageDown");
  }
}

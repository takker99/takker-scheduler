/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { sleep } from "./sleep.ts";

export interface MimicClickOptions {
  button?: number;
  X: number;
  Y: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}
export async function mimicClick(
  element: HTMLElement,
  options: MimicClickOptions,
) {
  const mouseOptions: MouseEventInit = {
    button: options.button ?? 0,
    clientX: options.X,
    clientY: options.Y,
    bubbles: true,
    cancelable: true,
    shiftKey: options.shiftKey,
    ctrlKey: options.ctrlKey,
    altKey: options.altKey,
    view: window,
  };
  element.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
  element.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
  element.dispatchEvent(new MouseEvent("click", mouseOptions));

  await Promise.resolve();
}

export interface MimicHoldDownOptions extends MimicClickOptions {
  holding?: number;
}
export async function mimicHoldDown(
  element: HTMLElement,
  options: MimicHoldDownOptions,
) {
  const touch = new Touch({
    identifier: 0,
    target: element,
    clientX: options.X,
    clientY: options.Y,
    pageX: options.X + window.scrollX,
    pageY: options.Y + window.scrollY,
  });
  const mouseOptions = {
    button: options.button ?? 0,
    clientX: options.X,
    clientY: options.Y,
    changedTouches: [touch],
    touches: [touch],
    bubbles: true,
    cancelable: true,
    shiftKey: options.shiftKey,
    ctrlKey: options.ctrlKey,
    altKey: options.altKey,
    view: window,
  };
  element.dispatchEvent(new TouchEvent("touchstart", mouseOptions));
  element.dispatchEvent(new MouseEvent("mousedown", mouseOptions));
  await sleep(options.holding ?? 1000);
  element.dispatchEvent(new MouseEvent("mouseup", mouseOptions));
  element.dispatchEvent(new TouchEvent("touchend", mouseOptions));
  element.dispatchEvent(new MouseEvent("click", mouseOptions));

  await sleep(10); // 待ち時間は感覚で決めた
}

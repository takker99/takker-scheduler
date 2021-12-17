/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
import {
  ensureArray,
  isNone,
  isNumber,
  isString,
} from "../deps/unknownutil.ts";
import type { Scrapbox } from "../deps/scrapbox.ts";
import { lines } from "./dom.ts";
declare const scrapbox: Scrapbox;

/** Get the line id from value
 *
 * If the line id can't be found, return `undefined`
 *
 * @param value - value the line id of which you want to get
 */
export function getLineId(value: unknown) {
  if (isNone(value)) return undefined;

  // 行番号のとき
  if (isNumber(value)) {
    ensureArray(scrapbox.Page.lines);
    scrapbox.Page.lines[value]?.id;
  }
  // 行IDのとき
  if (isString(value)) return value.startsWith("L") ? value.slice(1) : value;

  if (!(value instanceof HTMLElement)) return undefined;
  // 行のDOMだったとき
  if (value.classList.contains("line")) return value.id.slice(1);
  // 行の子要素だったとき
  const line = value.closest(".line");
  if (line) return line.id.slice(1);

  return undefined;
}

export function getLineNo(value: unknown) {
  if (isNone(value)) return undefined;

  // 行番号のとき
  if (isNumber(value)) return value;
  // 行ID or DOMのとき
  if (isString(value) || value instanceof HTMLElement) {
    const id = getLineId(value);
    ensureArray(scrapbox.Page.lines);
    return id ? scrapbox.Page.lines.findIndex((line) => line.id === id) : -1;
  }

  return undefined;
}

export function getLine(value: unknown) {
  if (isNone(value)) return undefined;
  ensureArray(scrapbox.Page.lines);

  // 行番号のとき
  if (isNumber(value)) {
    return scrapbox.Page.lines[value];
  }
  // 行ID or DOMのとき
  if (isString(value) || value instanceof HTMLElement) {
    const id = getLineId(value);
    return id ? scrapbox.Page.lines.find((line) => line.id === id) : undefined;
  }
}

export function getLineDOM(value: unknown) {
  if (isLineDOM(value)) return value;

  const id = getLineId(value);
  if (isNone(id)) return id;
  const line = document.getElementById(`L${id}`);
  if (isNone(line)) return undefined;
  return line as HTMLDivElement;
}
export function isLineDOM(dom: unknown): dom is HTMLDivElement {
  return dom instanceof HTMLDivElement && dom.classList.contains("line");
}
export function getLineCount() {
  ensureArray(scrapbox.Page.lines);
  return scrapbox.Page.lines.length;
}

export function getText(value: unknown) {
  if (isNone(value)) return undefined;
  ensureArray(scrapbox.Page.lines);

  // 数字と文字列は行として扱う
  if (isNumber(value) || isString(value)) return getLine(value)?.text;
  if (!(value instanceof HTMLElement)) return undefined;
  if (isLineDOM(value)) return getLine(value)?.text;
  // リンクのDOMだったとき
  // []や#つきで返す
  if (value.classList.contains("page-link")) {
    return value.textContent?.startsWith?.("[") ||
        value.textContent?.startsWith?.("#")
      ? value.textContent ?? undefined
      : `[${value.textContent}]`;
  }
  // 文字のDOMだったとき
  if (value.classList.contains("char-index")) {
    return value.textContent ?? undefined;
  }
  return undefined;
}

export function getExternalLink(dom: HTMLElement) {
  const link = dom.closest(".link");
  if (isNone(link)) return undefined;
  return link as HTMLElement;
}
export function getInternalLink(dom: HTMLElement) {
  const link = dom.closest(".page-link");
  if (isNone(link)) return undefined;
  return link as HTMLElement;
}
export function getLink(dom: HTMLElement) {
  const link = dom.closest(".link, .page-link");
  if (isNone(link)) return undefined;
  return link as HTMLElement;
}

export function getFormula(dom: HTMLElement) {
  const formula = dom.closest(".formula");
  if (isNone(formula)) return undefined;
  return formula as HTMLElement;
}
export function getNextLine(value: unknown) {
  const index = getLineNo(value);
  if (isNone(index)) return undefined;
  ensureArray(scrapbox.Page.lines);

  return scrapbox.Page.lines[index + 1];
}

export function getPrevLine(value: unknown) {
  const index = getLineNo(value);
  if (isNone(index)) return undefined;
  ensureArray(scrapbox.Page.lines);

  return scrapbox.Page.lines[index - 1];
}

export function getHeadLineDOM() {
  const line = lines()?.firstElementChild;
  if (isNone(line)) return undefined;
  return line as HTMLDivElement;
}
export function getTailLineDOM() {
  const line = lines()?.lastElementChild;
  if (isNone(line)) return undefined;
  return line as HTMLDivElement;
}
export function getIndentCount(value: unknown) {
  const text = getText(value);
  if (isNone(text)) return undefined;
  return text.match(/^(\s*)/)?.[1]?.length ?? 0;
}
export function getIndentLineCount(value: unknown) {
  const index = getLineNo(value);
  const base = getIndentCount(index);
  if (isNone(index) || isNone(base)) return undefined;
  let count = 0;
  while ((getIndentCount(index + count + 1) ?? -1) > base) {
    count++;
  }
  return count;
}

export function* charsInLine(value: unknown) {
  const line = getLineDOM(value);
  if (isNone(line)) return undefined;
  const chars = line.getElementsByClassName("char-index");
  for (let i = 0; i < chars.length; i++) {
    yield chars[0] as HTMLSpanElement;
  }
}

export function isCharDOM(dom: unknown): dom is HTMLSpanElement {
  return dom instanceof HTMLSpanElement && dom.classList.contains("char-index");
}

export function getIndex(dom: unknown) {
  if (!isCharDOM(dom)) throw Error("A char DOM is required.");

  const index = dom.className.match(/c-(\d+)/)?.[1];
  if (isNone(index)) throw Error('.char-index must have ".c-{\\d}"');
  return parseInt(index);
}
export function getHeadCharDOM(dom: HTMLElement | undefined | null) {
  const char = dom?.getElementsByClassName?.("c-0")?.[0];
  if (isNone(char)) return undefined;
  return char as HTMLSpanElement;
}

export function getTailCharDOM(dom: HTMLElement | undefined | null) {
  const char = dom?.querySelector(".char-index:last-of-type");
  if (isNone(char)) return undefined;
  return char as HTMLSpanElement;
}

export function getCharDOM(line: unknown, pos: number) {
  const char = getLineDOM(line)?.getElementsByClassName(`c-${pos}`)?.[0];
  if (isNone(char)) return undefined;
  return char as HTMLSpanElement;
}
export function getDOMFromPoint(x: number, y: number) {
  const targets = document.elementsFromPoint(x, y);
  const char = targets.find((target) =>
    target.classList.contains("char-index")
  );
  const line = targets.find((target) => target.classList.contains("line"));
  return {
    char: isNone(char) ? undefined : char as HTMLSpanElement,
    line: isNone(line) ? undefined : line as HTMLDivElement,
  };
}

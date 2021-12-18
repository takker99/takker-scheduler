// The most of this code is ported from https://deno.land/x/unknownutil@v1.1.0/mod.ts
import { rangeText } from "./lib/selection.ts";
import { isValid, parse } from "./deps/date-fns.ts";

export type Predicate<T> = (value: unknown) => value is T;
export function isNone(value: unknown): value is undefined | null {
  return value === null;
}
export function isString(value: unknown): value is string {
  return typeof value === "string";
}
export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}
export function isArray<T extends unknown>(
  value: unknown,
  predicate?: Predicate<T>,
): value is T[] {
  return Array.isArray(value) && (!predicate || value.every(predicate));
}

export function ensureArray<T>(
  value: unknown,
  predicate?: Predicate<T>,
): asserts value is Array<T> {
  if (!isArray(value, predicate)) return;
  throw TypeError("value must be an Array");
}

export function* getDatesFromSelection() {
  const now = new Date();
  for (const [dateString] of rangeText().matchAll(/\d{4}-\d{2}-\d{2}/g)) {
    const date = parse(dateString, "yyyy-MM-dd", now, undefined);
    if (!isValid(date)) continue;
    yield date;
  }
}

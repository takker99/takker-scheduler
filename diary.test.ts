/// <reference lib="deno.unstable" />
import { format, isDiaryPage, toDate, toTitle } from "./diary.ts";
import { assert, assertEquals } from "./deps/testing.ts";

const testData: [string, Date | undefined][] = [
  ["日刊記録sheet 2021-12-11", new Date(2021, 11, 11)],
  ["日刊記録sheet 2021-02-11", new Date(2021, 1, 11)],
  ["日刊記録sheet　2021-12-11", undefined],
];
Deno.test("isDiaryPage()", () =>
  testData.forEach(([text, date]) =>
    assert(date !== undefined ? isDiaryPage(text) : !isDiaryPage(text))
  ));
Deno.test("toDate()", () =>
  testData.forEach(([text, date]) => assertEquals(toDate(text), date)));
Deno.test("toTitle()", () =>
  testData.forEach(([text, date]) => {
    if (!date) return;
    assertEquals(toTitle(date), text);
  }));

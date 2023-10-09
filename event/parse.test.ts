/// <reference lib="deno.ns" />

import { parse } from "./parse.ts";
import { assertSnapshot } from "../deps/testing.ts";

const runTests = async (t: Deno.TestContext, args: string[]) => {
  for (const arg of args) {
    await t.step(arg, () => assertSnapshot(t, parse(arg)));
  }
};

Deno.test("parse()", async (t) => {
  await t.step("howm taskのみのときは`Task`で返す", (t) =>
    runTests(t, [
      "ハイウェイ惑星 買おうかな~@2023-09-12",
    ]));
  await t.step("taskがないときは終了時刻まで明記する", (t) =>
    runTests(t, [
      "ハイウェイ惑星 買おうかな@2023-09-12T12:50D10",
      "ハイウェイ惑星 買おうかな@2023-09-12T12:50/14:20",
      "終了時刻がないのでエラーになる@2023-09-12T12:50",
      "開始時刻がないのでエラー@2023-09-12D10",
    ]));
  await t.step("taskの日付情報から継承する", (t) =>
    runTests(t, [
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10@13",
      "ハイウェイ惑星 買おうかな~@2023-09-12D10@13T12:50",
      "ハイウェイ惑星 買おうかな~@2023-09-12@13T12:50D10",
      "ハイウェイ惑星 買おうかな~@2023-09-12@13T12:50/14:20",
      "ハイウェイ惑星 買おうかな~@2023-09-12@12-13T12:50D10",
      "ハイウェイ惑星 買おうかな~@2023-09-12@2024-12-13T12:50D10",
      "時刻がない~@2023-09-12@13",
      "終了時刻がない~@2023-09-12@13T13:45",
      "開始時刻がない~@2023-09-12@13D45",
    ]));
  await t.step("taskとeventの日付指定は順不同", (t) =>
    runTests(t, [
      "@13ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10",
      "~@2023-09-12T12:50D10 ←がTaskを指定し、~@09-24←がEventを指定する",
    ]));
});
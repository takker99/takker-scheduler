/// <reference lib="deno.ns" />

import { parse } from "./parse.ts";
import { assertSnapshot } from "../deps/testing.ts";

Deno.test("parse()", async (t) => {
  await t.step("compatibility", async (t) => {
    const args = [
      "⬜タスクリンク+@2023-09-10",
      "✅終了したリンク+@2023-09-10",
      "📝やり途中の+@2023-09-10リンク",
      "先頭にない絵文字は✅タスク判定と関係ない+@2023-09-10",
      "✅日付がないタスクはタスクとみなさない",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
  });
  {
    const arg = " 前後の 空白は　+@2023-09-11 無視される　  ";
    await t.step(arg, () => assertSnapshot(t, parse(arg)));
  }
  await t.step("type", async (t) => {
    const args = [
      "!@2002-10-20 ハイウェイ惑星 〆切",
      "ハイウェイ惑星 〆切!4@2002-10-20",
      "-@2002-10-20 ハイウェイ惑星 買おう",
      "ハイウェイ惑星 買おうかな~@2023-09-12",
      "ハイウェイ惑星+@2002-10-20 買おう",
      "指定子なしはタスクとみなさない@2023-04-11T13:00",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
  });
  await t.step("start datetime", async (t) => {
    const args = [
      "ごはんを食べる+3@2023-04-30",
      "ごはんを食べる+3@2023-04※タスク扱いされない",
      "ごはんを食べる+3@2023※タスク扱いされない",
      "ごはんを食べる+3@2023-04-30T12:23",
      "ごはんを食べる+3@2023-04-30T12:23:45 ※秒は無視する",
      "ごはんを食べる+3@2023-04-30 12:23:※区切り文字が必要",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
  });
  await t.step("end datetime", async (t) => {
    const args = [
      "ごはんを食べる+3@2023-04-13/23D45",
      "ごはんを食べる+3@2023-04-13/05-23D45",
      "ごはんを食べる+3@2023-04-13/2024-05-23D45",
      "ごはんを食べる+3@2023-04-13/2024-05-23T05:47D45",
      "ごはんを食べる+3@2023-04-13/05-23T05:47D45",
      "ごはんを食べる+3@2023-04-13/23T05:47D45",
      "ごはんを食べる+3@2023-04-13/T05:47D45",
      "ごはんを食べる+3@2023-04-13/05:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/23D45",
      "ごはんを食べる+3@2023-04-13T13:40/05-23D45",
      "ごはんを食べる+3@2023-04-13T13:40/2025-05-23D45",
      "ごはんを食べる+3@2023-04-13T13:40/2025-05-23T05:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/05-23T05:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/23T05:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/T05:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/14:47D45",
      "ごはんを食べる+3@2023-04-13D45/05:47",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
  });
  await t.step("errors", async (t) => {
    const args = [
      "+3@2023-04-30/23D45 終了日時が開始日時より早まってはならない",
      "不正な日時を与えるとInvalid Dateになる+3@2023-04-33/05-23D45",
      "ごはんを食べる+3@2023-04-13T13:40/05:67D45",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
  });
});

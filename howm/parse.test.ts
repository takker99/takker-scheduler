/// <reference lib="deno.ns" />

import { makeRepeat, parse, RecurrentEvent, toString } from "./parse.ts";
import { assert, assertEquals, assertSnapshot } from "../deps/testing.ts";
import { toDate } from "./localDate.ts";
import { isErr, unwrapErr, unwrapOk } from "../deps/option-t.ts";

const runTests = async (t: Deno.TestContext, args: string[]) => {
  for (const arg of args) {
    const result = parse(arg);
    await t.step(
      arg,
      () =>
        assertSnapshot(
          t,
          !result
            ? result
            : isErr(result)
            ? unwrapErr(result)
            : unwrapOk(result),
        ),
    );
  }
};

Deno.test("parse()", async (t) => {
  await t.step("compatibility", (t) =>
    runTests(t, [
      "⬜タスクリンク+@2023-09-10",
      "✅終了したリンク+@2023-09-10",
      "❌失敗したタスクも終了扱いとする+@2023-09-10",
      "📝やり途中の+@2023-09-10リンク",
      "先頭にない絵文字は✅タスク判定と関係ない+@2023-09-10",
      "✅日付がないタスクはタスクとみなさない",
    ]));
  {
    const arg = " 前後の 空白は　+@2023-09-11 無視される　  ";
    await t.step(arg, () => assertSnapshot(t, parse(arg)));
  }
  await t.step("type", (t) =>
    runTests(t, [
      "!@2002-10-20 ハイウェイ惑星 〆切",
      "ハイウェイ惑星 〆切!4@2002-10-20",
      "-@2002-10-20 ハイウェイ惑星 買おう",
      "ハイウェイ惑星 買おうかな~@2023-09-12",
      "ハイウェイ惑星+@2002-10-20 買おう",
      "指定子なしはEventとして扱う@2023-04-11T13:00/14:00",
    ]));
  await t.step("start datetime", (t) =>
    runTests(t, [
      "ごはんを食べる+3@2023-04-30",
      "ごはんを食べる+3@2023-04※タスク扱いされない",
      "ごはんを食べる+3@2023※タスク扱いされない",
      "ごはんを食べる+3@2023-04-30T12:23",
      "ごはんを食べる+3@2023-04-30T12:23:45 ※秒は無視する",
      "ごはんを食べる+3@2023-04-30 12:23:※区切り文字が必要",
    ]));
  await t.step("end datetime", (t) =>
    runTests(t, [
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
      "ごはんを食べる+3@2023-04-13T13:40/T05:47D45※終了時刻のみを指定する場合はTをつけない",
      "ごはんを食べる+3@2023-04-13T13:40/14:47D45",
      "ごはんを食べる+3@2023-04-13T13:40/14:47",
      "ごはんを食べる+3@2023-04-13D45/05:47",
    ]));
  await t.step("errors", (t) =>
    runTests(t, [
      "+3@2023-04-30/23D45 終了日時が開始日時より早まってはならない",
      "不正な日時を与えるとInvalid Dateになる+3@2023-04-33/05-23D45",
      "不正な日時+3@2023-04-13T13:40/05:67D45",
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
      "@13順序を逆にすると認識されない~@2023-09-12T12:50D10",
    ]));
  await t.step("繰り返し", (t) =>
    runTests(t, [
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10R4@13",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10R47@13",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10R",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10RM8",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10RY8",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10RW8",
      "ハイウェイ惑星 買おうかな~@2023-09-12T12:50D10RD8",
      "読書会@2023-09-12T12:50D10RD8",
    ]));
});

Deno.test("makeRepeat()", () => {
  {
    const task = "ひるごはん@2023-10-09T12:00D30R1";
    const parsed = unwrapOk(parse(task)!) as unknown as RecurrentEvent;
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2023, month: 10, date: 10 }),
      )!;
      assert(event.generated);
      assertEquals(toString(event), "@2023-10-10T12:00D30ひるごはん");
    }
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2023, month: 11, date: 10 }),
      )!;
      assert(event.generated);
      assertEquals(toString(event), "@2023-11-10T12:00D30ひるごはん");
    }
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2024, month: 11, date: 10 }),
      )!;
      assert(event.generated);
      assertEquals(toString(event), "@2024-11-10T12:00D30ひるごはん");
    }
  }

  {
    const task = "爪切り@2023-10-09T12:00D5RW1";
    const parsed = unwrapOk(parse(task)!) as unknown as RecurrentEvent;
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2023, month: 10, date: 10 }),
      )!;
      assertEquals(event, undefined);
    }
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2023, month: 10, date: 15 }),
      )!;
      assertEquals(event, undefined);
    }
    {
      const event = makeRepeat(
        parsed,
        toDate({ year: 2023, month: 10, date: 16 }),
      )!;
      assert(event.generated);
      assertEquals(toString(event), "@2023-10-16T12:00D5爪切り");
    }
  }
});

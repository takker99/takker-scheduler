/// <reference lib="deno.ns" />

import { calcFreshness } from "./freshness.ts";
import { parse, Reminder } from "./parse.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("calcFreshness()", async (t) => {
  await t.step("done", () => {
    const now = new Date("2023-04-10T00:20");
    const task = parse("読書会.@2023-04-11T13:00")!.value as Reminder;
    const freshness = task.freshness

    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(11);
    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setHours(23);
    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setHours(0);
    now.setDate(12);
    assertEquals(calcFreshness(freshness, now), -Infinity);
  });
  await t.step("deadline", () => {
    const now = new Date("2002-10-10T00:00");
    const task = parse("ハイウェイ惑星 〆切!@2002-10-20")!.value as Reminder;
    const freshness = task.freshness

    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(12);
    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(20 - 7);
    assertEquals(calcFreshness(freshness, now), -7);
    now.setHours(12);
    assertEquals(calcFreshness(freshness, now), -6.5);
    now.setHours(23);
    assertEquals(calcFreshness(freshness, now).toFixed(2), "-6.04");
    now.setHours(0);
    for (const day of [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]) {
      now.setDate(day);
      assertEquals(calcFreshness(freshness, now), day - 20);
    }
  });
  await t.step("todo", () => {
    const now = new Date("2002-10-10T00:00");
    const task = parse("ハイウェイ惑星+@2002-10-20 買うべし")!
      .value as Reminder;
    const freshness = task.freshness

    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(12);
    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(20 - 7);
    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(20);
    now.setHours(12);
    assertEquals(calcFreshness(freshness, now), -6.5);
    now.setHours(0);
    for (const day of [20, 21, 22, 23, 24, 25, 26, 27]) {
      now.setDate(day);
      assertEquals(calcFreshness(freshness, now), day - 27);
    }
    for (const day of [28, 29, 30]) {
      now.setDate(day);
      assertEquals(calcFreshness(freshness, now), 0);
    }
  });
  await t.step("note", async (t) => {
    await t.step("-1", () => {
      const now = new Date("2002-10-10T00:00");
      const task = parse("-@2002-10-20 ハイウェイ惑星 買おう")!
        .value as Reminder;
    const freshness = task.freshness

      assertEquals(calcFreshness(freshness, now), -Infinity);
      now.setDate(12);
      assertEquals(calcFreshness(freshness, now), -Infinity);
      now.setDate(20 - 7);
      assertEquals(calcFreshness(freshness, now), -Infinity);
      now.setDate(20);
      now.setHours(12);
      assertEquals(calcFreshness(freshness, now), -0.5);
      now.setHours(0);
      for (const day of [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]) {
        now.setDate(day);
        assertEquals(calcFreshness(freshness, now), 20 - day);
      }
    });
    await t.step("-3", () => {
      const now = new Date("2002-10-10T00:00");
      const task = parse("-3@2002-10-20 ハイウェイ惑星 買おう")!
        .value as Reminder;
    const freshness = task.freshness

      assertEquals(calcFreshness(freshness, now), -Infinity);
      now.setDate(12);
      assertEquals(calcFreshness(freshness, now), -Infinity);
      now.setDate(20);
      assertEquals(calcFreshness(freshness, now), 0);
      now.setDate(21);
      now.setHours(12);
      assertEquals(calcFreshness(freshness, now), -0.5);
      now.setHours(0);
      for (const day of [20, 23, 26, 29]) {
        now.setDate(day);
        assertEquals(calcFreshness(freshness, now), (20 - day) / 3);
      }
    });
  });
  await t.step("up-down", () => {
    const now = new Date("2023-09-10T00:00");
    const task = parse("ハイウェイ惑星 買おうかな~@2023-09-12")!
      .value as Reminder;
    const freshness = task.freshness

    assertEquals(calcFreshness(freshness, now), -Infinity);
    now.setDate(11);
    assertEquals(calcFreshness(freshness, now), -Infinity);

    now.setDate(12);
    assertEquals(calcFreshness(freshness, now), 0);
    now.setDate(27);
    assertEquals(calcFreshness(freshness, now), -60);
    now.setDate(42);
    assertEquals(calcFreshness(freshness, now), 0);
  });
});

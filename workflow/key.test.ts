import { toKey, toLocalDate, toStartOfWeek, toWeekKey } from "./key.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("toKey()", () => {
  assertEquals(toKey(new Date(2022, 0, 1)), "2022-01-01");
  assertEquals(toKey(new Date(2022, 1, 15)), "2022-02-15");
  assertEquals(toKey(new Date(2023, 11, 31)), "2023-12-31");
  // Add more test cases here
});

Deno.test("toLocalDate()", () => {
  assertEquals(toLocalDate("2022-01-01"), { year: 2022, month: 1, date: 1 });
  assertEquals(toLocalDate("2022-02-15"), { year: 2022, month: 2, date: 15 });
  assertEquals(toLocalDate("2023-12-31"), { year: 2023, month: 12, date: 31 });
  // Add more test cases here
});

Deno.test("toStartOfWeek()", () => {
  assertEquals(toStartOfWeek("2022-w1"), new Date(2021, 11, 26));
  assertEquals(toStartOfWeek("2022-w2"), new Date(2022, 0, 2));
  assertEquals(toStartOfWeek("2022-w3"), new Date(2022, 0, 9));
  // Add more test cases here
});

Deno.test("toWeekKey()", () => {
  assertEquals(toWeekKey(new Date(2022, 0, 1)), "2022-w01");
  assertEquals(toWeekKey(new Date(2022, 0, 2)), "2022-w02");
  assertEquals(toWeekKey(new Date(2022, 0, 8)), "2022-w02");
  // Add more test cases here
});

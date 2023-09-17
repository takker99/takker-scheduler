import { format, isBefore } from "./localDate.ts";
import { assert, assertEquals } from "../deps/testing.ts";

Deno.test("format()", () => {
  assertEquals(format({ year: 2023, month: 5, date: 23 }), "2023-05-23");
  assertEquals(format({ year: 2023, month: 5, date: 64 }), "2023-05-64");
  assertEquals(
    format({ year: 2023, month: 5, date: 23, hours: 12, minutes: 24 }),
    "2023-05-23T12:24",
  );
  assertEquals(
    format({ year: 2023, month: 5, date: 23, hours: 12, minutes: 99 }),
    "2023-05-23T12:99",
  );
});

Deno.test("isBefore()", async (t) => {
  await t.step("date", () => {
    assert(
      isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2024,
        month: 5,
        date: 23,
      }),
    );
    assert(
      isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2024,
        month: 7,
        date: 23,
      }),
    );
    assert(
      !isBefore({ year: 2025, month: 5, date: 23 }, {
        year: 2024,
        month: 7,
        date: 23,
      }),
    );
    assert(
      isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2023,
        month: 6,
        date: 23,
      }),
    );
    assert(
      isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2023,
        month: 5,
        date: 33,
      }),
    );
    assert(
      !isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2023,
        month: 5,
        date: 23,
      }),
    );
  });

  await t.step("datetime", () => {
    assert(
      isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2023,
        month: 5,
        date: 23,
        hours: 12,
        minutes: 23,
      }),
    );
    assert(
      !isBefore({ year: 2023, month: 5, date: 23 }, {
        year: 2023,
        month: 5,
        date: 23,
        hours: 0,
        minutes: 0,
      }),
    );
    assert(
      !isBefore({ year: 2023, month: 5, date: 23, hours: 12, minutes: 23 }, {
        year: 2023,
        month: 5,
        date: 23,
        hours: 12,
        minutes: 23,
      }),
    );
    assert(
      isBefore({ year: 2023, month: 5, date: 23, hours: 12, minutes: 23 }, {
        year: 2023,
        month: 5,
        date: 23,
        hours: 13,
        minutes: 23,
      }),
    );
  });
});

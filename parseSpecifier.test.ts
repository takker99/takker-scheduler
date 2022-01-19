/// <reference lib="deno.unstable" />

import { parseSpecifier } from "./parseSpecifier.ts";
import { assertEquals } from "./deps/testing.ts";

Deno.test("parseSpecifier()", async (t) => {
  await t.step("no option - > undefined", () => {
    assertEquals<[string, Date] | undefined>(
      parseSpecifier("テストテスト", new Date()),
      undefined,
    );
  });

  await t.step("absolute option", () => {
    const base = new Date(2022, 0, 1, 12, 17);
    const testData: [string, Date][] = [
      [
        "タスクの名前 s:2022-01-13T09:34",
        new Date(2022, 0, 13, 9, 34),
      ],
      [
        "タスクの名前 s:2021-05-13T09",
        new Date(2021, 4, 13, 9, 17),
      ],
      [
        "タスクの名前 s:02-12T09:34",
        new Date(2022, 1, 12, 9, 34),
      ],
      [
        "タスクの名前 s:02-20T09",
        new Date(2022, 1, 20, 9, 17),
      ],
      [
        "タスクの名前 s:12T09:34",
        new Date(2022, 0, 12, 9, 34),
      ],
      [
        "タスクの名前 s:20T09",
        new Date(2022, 0, 20, 9, 17),
      ],
      [
        "タスクの名前 s:T10:34",
        new Date(2022, 0, 1, 10, 34),
      ],
      [
        "タスクの名前 s:09:37",
        new Date(2022, 0, 1, 9, 37),
      ],
      [
        "タスクの名前 s:T23",
        new Date(2022, 0, 1, 23, 17),
      ],
      [
        "タスクの名前 s:11",
        new Date(2022, 0, 1, 11, 17),
      ],
    ];
    for (const [text, start] of testData) {
      assertEquals<[string, Date] | undefined>(parseSpecifier(text, base), [
        "タスクの名前",
        start,
      ]);
    }
  });

  await t.step("relative option", () => {
    const base = new Date(2022, 2, 1, 12, 17);
    const testData: [string, Date][] = [
      [
        "タスクの名前 s:p18m",
        new Date(2022, 2, 1, 12, 35),
      ],
      [
        "タスクの名前 s:p180m",
        new Date(2022, 2, 1, 15, 17),
      ],
      [
        "タスクの名前 s:p4h",
        new Date(2022, 2, 1, 16, 17),
      ],
      [
        "タスクの名前 s:p2w",
        new Date(2022, 2, 15, 12, 17),
      ],
      [
        "タスクの名前 s:p15d",
        new Date(2022, 2, 16, 12, 17),
      ],
    ];
    for (const [text, start] of testData) {
      assertEquals<[string, Date] | undefined>(
        parseSpecifier(text, base),
        ["タスクの名前", start],
      );
    }
  });
});

import { parse, Task } from "./parse.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("parse()", async (t) => {
  await t.step("detect status", () => {
    assertEquals<Task | undefined>(parse("普通のリンク"), undefined);
    assertEquals<Task | undefined>(parse("⬜タスクリンク"), {
      name: "タスクリンク",
      raw: "⬜タスクリンク",
      status: "⬜",
    });
    assertEquals<Task | undefined>(parse("✅終了したリンク"), {
      name: "終了したリンク",
      raw: "✅終了したリンク",
      status: "✅",
    });
    assertEquals<Task | undefined>(parse("📝やり途中のリンク"), {
      name: "やり途中のリンク",
      raw: "📝やり途中のリンク",
      status: "📝",
    });
    assertEquals<Task | undefined>(parse("⬜ 前後の 空白は　無視される　  "), {
      name: "前後の 空白は　無視される",
      raw: "⬜ 前後の 空白は　無視される　  ",
      status: "⬜",
    });
    assertEquals<Task | undefined>(parse("これは⬜タスクではない"), undefined);
    assertEquals<Task | undefined>(
      parse("@2022-03-14 タスクリンク"),
      undefined,
    );
    assertEquals<Task | undefined>(
      parse("~2022-03-14 タスクリンク"),
      undefined,
    );
    assertEquals<Task | undefined>(
      parse("タスクリンク @2022-03-14"),
      undefined,
    );
    assertEquals<Task | undefined>(
      parse("タスクリンク ~2022-03-14"),
      undefined,
    );
  });

  await t.step("締切", () => {
    const data: [Omit<Task, "raw">, string[]][] = [
      [
        {
          name: "タスクリンク",
          status: "⬜",
          due: new Date(9999, 2, 14),
          startAt: { type: "date", year: 9999, month: 1, date: 28 },
        },
        [
          "⬜~9999-03-14タスクリンク",
          "⬜~9999-03-14 タスクリンク",
          "⬜タスク~9999-03-14リンク",
          "⬜タスクリンク~9999-03-14",
          "⬜タスクリンク ~9999-03-14",
        ],
      ],
      [
        {
          name: "~9999/03/14 タスクリンク",
          status: "⬜",
        },
        ["⬜~9999/03/14 タスクリンク"],
      ],
    ];

    for (const [task, links] of data) {
      for (const raw of links) {
        assertEquals<Task | undefined>(parse(raw), { ...task, raw });
      }
    }
    assertEquals<Task | undefined>(
      parse("⬜~2022-03-14タスクリンク", new Date(2021, 2, 14)),
      {
        name: "タスクリンク",
        raw: "⬜~2022-03-14タスクリンク",
        status: "⬜",
        due: new Date(2022, 2, 14),
        startAt: { type: "date", year: 2022, month: 1, date: 28 },
      },
    );
  });

  await t.step("開始/終了日時", async (t) => {
    await t.step("yyyy-MM-dd", () => {
      const data: [Omit<Task, "raw">, string[]][] = [
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "date", year: 2022, month: 2, date: 14 },
          },
          [
            "⬜@2022-03-14タスクリンク",
            "⬜@2022-03-14 タスクリンク",
            "⬜タスク@2022-03-14リンク",
            "⬜タスクリンク@2022-03-14",
            "⬜タスクリンク @2022-03-14",
          ],
        ],
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "date", year: 2022, month: 2, date: 14 },
            duration: 45,
          },
          [
            "⬜@2022-03-14D45タスクリンク",
            "⬜@2022-03-14D45 タスクリンク",
            "⬜タスク@2022-03-14D45リンク",
            "⬜タスクリンク@2022-03-14D45",
            "⬜タスクリンク @2022-03-14D45",
          ],
        ],
        [
          {
            name: "D45 タスクリンク",
            status: "⬜",
            startAt: { type: "date", year: 2022, month: 2, date: 14 },
          },
          ["⬜@2022-03-14 D45 タスクリンク"],
        ],
        [
          {
            name: "/03/14 タスクリンク",
            status: "⬜",
            startAt: { type: "year", year: 2022 },
          },
          ["⬜@2022/03/14 タスクリンク"],
        ],
        [
          {
            name: "~を!に置き換える",
            status: "⬜",
            startAt: { type: "date", year: 2022, month: 2, date: 18 },
          },
          ["⬜@2022-03-18 ~を!に置き換える"],
        ],
        [
          {
            name: "SoM1-2022F-12.2 active読書",
            status: "⬜",
            startAt: {
              type: "date",
              year: 2022,
              month: 6,
              date: 4,
            },
          },
          ["⬜@2022-07-04 SoM1-2022F-12.2 active読書"],
        ],
      ];

      for (const [task, links] of data) {
        for (const raw of links) {
          assertEquals<Task | undefined>(parse(raw), { ...task, raw });
        }
      }
    });

    await t.step("yyyy-MM-ddTHH:mm", () => {
      const data: [Omit<Task, "raw">, string[]][] = [
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: {
              type: "date",
              year: 2022,
              month: 2,
              date: 14,
              hours: 17,
              minutes: 25,
            },
          },
          [
            "⬜@2022-03-14T17:25タスクリンク",
            "⬜@2022-03-14T17:25 タスクリンク",
            "⬜タスク@2022-03-14T17:25リンク",
            "⬜タスクリンク@2022-03-14T17:25",
            "⬜タスクリンク @2022-03-14T17:25",
          ],
        ],
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: {
              type: "date",
              year: 2022,
              month: 2,
              date: 14,
              hours: 7,
              minutes: 25,
            },
          },
          [
            "⬜@2022-03-14T07:25タスクリンク",
            "⬜@2022-03-14T07:25 タスクリンク",
            "⬜タスク@2022-03-14T07:25リンク",
            "⬜タスクリンク@2022-03-14T07:25",
            "⬜タスクリンク @2022-03-14T07:25",
          ],
        ],
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: {
              type: "date",
              year: 2022,
              month: 2,
              date: 14,
              hours: 23,
              minutes: 19,
            },
            duration: 61,
          },
          [
            "⬜@2022-03-14T23:19D61タスクリンク",
            "⬜@2022-03-14T23:19D0061 タスクリンク",
            "⬜タスク@2022-03-14T23:19/00:20リンク",
            "⬜タスクリンク@2022-03-14T23:19/00:20",
          ],
        ],
      ];

      for (const [task, links] of data) {
        for (const raw of links) {
          assertEquals<Task | undefined>(parse(raw), { ...task, raw });
        }
      }
    });

    await t.step("yyyy-MM", () => {
      const data: [Omit<Task, "raw">, string[]][] = [
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "month", year: 2022, month: 2 },
          },
          [
            "⬜@2022-03タスクリンク",
            "⬜@2022-03 タスクリンク",
            "⬜タスク@2022-03リンク",
            "⬜タスクリンク@2022-03",
            "⬜タスクリンク @2022-03",
          ],
        ],
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "month", year: 2022, month: 2 },
            duration: 45454,
          },
          [
            "⬜@2022-03D45454 タスクリンク",
            "⬜@2022-03D45454タスクリンク",
            "⬜タスク@2022-03D45454リンク",
            "⬜タスクリンク@2022-03D45454",
            "⬜タスクリンク @2022-03D45454",
          ],
        ],
      ];

      for (const [task, links] of data) {
        for (const raw of links) {
          assertEquals<Task | undefined>(parse(raw), { ...task, raw });
        }
      }
    });

    await t.step("yyyy-wWW", () => {
      const data: [Omit<Task, "raw">, string[]][] = [
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "week", year: 2022, week: 24 },
          },
          [
            "⬜@2022-w24タスクリンク",
            "⬜@2022-w24 タスクリンク",
            "⬜タスク@2022-w24リンク",
            "⬜タスクリンク@2022-w24",
            "⬜タスクリンク @2022-w24",
          ],
        ],
        [
          {
            name: "タスクリンク",
            status: "⬜",
            startAt: { type: "week", year: 2022, week: 24 },
            duration: 35,
          },
          [
            "⬜@2022-w24D35タスクリンク",
            "⬜@2022-w24D0035 タスクリンク",
            "⬜タスク@2022-w24D035リンク",
            "⬜タスクリンク@2022-w24D000035",
            "⬜タスクリンク @2022-w24D35",
          ],
        ],
      ];

      for (const [task, links] of data) {
        for (const raw of links) {
          assertEquals<Task | undefined>(parse(raw), { ...task, raw });
        }
      }
    });
  });

  await t.step("締切 & いつ頃やるか", () => {
    const task: Omit<Task, "raw"> = {
      name: "タスクリンク",
      status: "⬜",
      due: new Date(2023, 2, 14),
      startAt: {
        type: "week",
        year: 2022,
        week: 25,
      },
    };
    const links = [
      "⬜@2022-w25~2023-03-14タスクリンク",
      "⬜@2022-w25~2023-03-14 タスクリンク",
      "⬜@2022-w25 ~2023-03-14タスクリンク",
      "⬜~2023-03-14@2022-w25タスクリンク",
      "⬜~2023-03-14 @2022-w25タスクリンク",
      "⬜タスク~2023-03-14@2022-w25リンク",
      "⬜タスク@2022-w25~2023-03-14リンク",
      "⬜タスクリンク@2022-w25~2023-03-14",
      "⬜タスクリンク @2022-w25~2023-03-14",
      "⬜タスクリンク@2022-w25 ~2023-03-14",
      "⬜タスクリンク~2023-03-14@2022-w25",
      "⬜タスクリンク ~2023-03-14 @2022-w25  ",
    ];
    for (const raw of links) {
      assertEquals<Task | undefined>(parse(raw), { ...task, raw });
    }
  });
});

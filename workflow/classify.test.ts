import { parse } from "./parse.ts";
import { Category, classify as group } from "./classify.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("group()", async (t) => {
  await t.step("no period", () => {
    const date = new Date(2022, 1, 14);
    assertEquals<Category>(
      group(parse("⬜タスクリンク", date)!, date),
      "no startAt",
    );
  });

  await t.step("~yyyy-MM-dd", () => {
    const date = new Date(2022, 1, 14);
    assertEquals<Category>(
      group(parse("⬜~2022-02-13タスクリンク", date)!, date),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜~2022-02-28タスクリンク", date)!, date),
      "today",
    );
    assertEquals<Category>(
      group(parse("⬜~2022-03-05タスクリンク", date)!, date),
      "in week",
    );
    assertEquals<Category>(
      group(parse("⬜~2022-03-06タスクリンク", date)!, date),
      "in next week",
    );
    assertEquals<Category>(
      group(parse("⬜~2022-03-12タスクリンク", date)!, date),
      "in next week",
    );
  });

  await t.step("@yyyy-MM-dd", () => {
    const date = new Date(2022, 2, 14);
    assertEquals<Category>(
      group(parse("⬜@2022-03-13タスクリンク", date)!, date),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-14タスクリンク", date)!, date),
      "today",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-15タスクリンク", date)!, date),
      "tomorrow",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-16タスクリンク", date)!, date),
      "in week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-19タスクリンク", date)!, date),
      "in week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-20タスクリンク", date)!, date),
      "in next week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-26タスクリンク", date)!, date),
      "in next week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-27タスクリンク", date)!, date),
      "in month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03-30タスクリンク", date)!, date),
      "in month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-04-30タスクリンク", date)!, date),
      "in next month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-07-30タスクリンク", date)!, date),
      "in year",
    );
    assertEquals<Category>(
      group(parse("⬜@2023-07-30タスクリンク", date)!, date),
      "in next year",
    );
    assertEquals<Category>(
      group(parse("⬜@2025-07-30タスクリンク", date)!, date),
      "someday",
    );

    const date2 = new Date(2022, 11, 29);
    assertEquals<Category>(
      group(parse("⬜@2022-02-31タスクリンク", date2)!, date2),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-12-29タスクリンク", date2)!, date2),
      "today",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-12-30タスクリンク", date2)!, date2),
      "tomorrow",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-12-31タスクリンク", date2)!, date2),
      "in week",
    );
    assertEquals<Category>(
      group(parse("⬜@2023-01-04タスクリンク", date2)!, date2),
      "in next week",
    );
    assertEquals<Category>(
      group(parse("⬜@2023-01-01タスクリンク", date2)!, date2),
      "in next week",
    );
  });

  await t.step("@yyyy-wWW", () => {
    const date = new Date(2022, 2, 14);
    assertEquals<Category>(
      group(parse("⬜@2022-w11タスクリンク", date)!, date),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-w12タスクリンク", date)!, date),
      "in week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-w13タスクリンク", date)!, date),
      "in next week",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-w14タスクリンク", date)!, date),
      "in month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-w16タスクリンク", date)!, date),
      "in next month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-w24タスクリンク", date)!, date),
      "in year",
    );
    assertEquals<Category>(
      group(parse("⬜@2023-w24タスクリンク", date)!, date),
      "in next year",
    );
    assertEquals<Category>(
      group(parse("⬜@2024-w24タスクリンク", date)!, date),
      "someday",
    );
  });

  await t.step("@yyyy-MM", () => {
    const date = new Date(2022, 2, 14);
    assertEquals<Category>(
      group(parse("⬜@2022-02タスクリンク", date)!, date),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-03タスクリンク", date)!, date),
      "in month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-04タスクリンク", date)!, date),
      "in next month",
    );
    assertEquals<Category>(
      group(parse("⬜@2022-05タスクリンク", date)!, date),
      "in year",
    );
    assertEquals<Category>(
      group(parse("⬜@2023-05タスクリンク", date)!, date),
      "in next year",
    );
    assertEquals<Category>(
      group(parse("⬜@2053-05タスクリンク", date)!, date),
      "someday",
    );
  });

  await t.step("@yyyy", () => {
    const date = new Date(2022, 2, 14);
    assertEquals<Category>(
      group(parse("⬜@2021タスクリンク", date)!, date),
      "missed",
    );
    assertEquals<Category>(
      group(parse("⬜@2022タスクリンク", date)!, date),
      "in year",
    );
    assertEquals<Category>(
      group(parse("⬜@2023タスクリンク", date)!, date),
      "in next year",
    );
    assertEquals<Category>(
      group(parse("⬜@2025タスクリンク", date)!, date),
      "someday",
    );
  });
});

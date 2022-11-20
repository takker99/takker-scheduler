import { toString } from "../task.ts";
import type { TaskBlock } from "../task.ts";
import { getLineRange } from "./getLineRange.ts";
import { calcStart } from "../calcStart.ts";
import { parseSpecifier } from "../parseSpecifier.ts";
import { differenceInMinutes, isAfter } from "../deps/date-fns.ts";
import { getLines, replaceLines } from "../deps/scrapbox-std-dom.ts";

/** 選択範囲中の項目を判断する時間を設ける */
export const makeJudgeTimeFromSelection = async (): Promise<void> => {
  // 選択範囲から判断する項目と開始日時を取得する
  const [start, end] = getLineRange();
  const stacks = getLines().slice(start, end + 1)
    .flatMap((line) => {
      const text = line.text.trimEnd(); // インデントは維持する
      if (text === "") return [];
      const { name = text, start = calcStart(line.updated) } =
        parseSpecifier(text, new Date(line.updated * 1000)) ?? {};
      if (name === "") return [];
      return { name, start };
    });

  // インデント付きタスクを作る
  const tasks: TaskBlock[] = [];
  while (stacks.length > 0) {
    const stack = stacks.shift();
    if (!stack) break;
    const task: TaskBlock = {
      title: "判断time",
      base: stack.start,
      plan: {
        start: stack.start,
        duration: 5 * 60,
      },
      record: {},
      lines: [
        " 判断する項目",
        `  ${stack.name}`,
      ],
    };

    // stack.startから3時間以内に収まるタスクをまとめる
    const date = task.base;
    for (let i = 0; i < stacks.length; i++) {
      if (
        (isAfter(stacks[i].start, date)
          ? differenceInMinutes(stacks[i].start, date)
          : differenceInMinutes(date, stacks[i].start)) >= 180
      ) {
        continue;
      }
      // stacksからtaskに移動する
      const [{ name }] = stacks.splice(i, 1);
      task.lines.push(`  ${name}`);

      i--;
    }

    tasks.push(task);
  }

  if (tasks.length === 0) return;

  // テキストに変換する
  const text = tasks.flatMap((task) => [toString(task), ...task.lines]).join(
    "\n",
  );

  // 書き込む
  await replaceLines(start, end, text);
};

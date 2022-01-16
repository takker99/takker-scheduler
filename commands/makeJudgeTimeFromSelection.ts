import { pushTasks } from "../pushTasks.ts";
import type { Task } from "../task.ts";
import { getLineRange } from "./getLineRange.ts";
import { sleep } from "../lib/sleep.ts";
import { getLines } from "../lib/node.ts";
import { deleteLines, insertLine } from "../lib/edit.ts";
import {
  makeCheckCircle,
  makeExclamationTriangle,
  makeSpinner,
  useStatusBar,
} from "../lib/statusBar.ts";
import { differenceInMinutes, isAfter } from "../deps/date-fns.ts";

/** 開始日時を計算する
 *
 * @param happen タスクが発生した日時のUNIX時刻
 * @param duration 発生から何日目までを締め切りとするか
 * @return 開始日時
 */
const toStart = (happen: number, duration = 7): Date =>
  new Date(
    (
      happen +
      (24 * 60 * 60 * 30 * ((duration + 1) ** 1.5 - 1)) / ((300 + 1) ** 1.5 - 1)
    ) * 1000,
  );

/** 選択範囲中の項目を判断する時間を設ける */
export async function makeJudgeTimeFromSelection(project: string) {
  // 選択範囲から判断する項目と開始日時を取得する
  const [start, end] = getLineRange();
  const selectedLines = getLines().slice(start, end + 1).map((line) =>
    line.text
  );
  const stacks = getLines().slice(start, end + 1)
    .flatMap((line) => {
      const name = line.text.trim();
      const start = toStart(line.updated);
      if (name === "") return [];
      return { name, start };
    });

  const tasks: (Task & { lines: string[] })[] = [];
  while (stacks.length > 0) {
    const stack = stacks.shift();
    if (!stack) break;
    const task: Task & { lines: string[] } = {
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

  // 先に選択範囲を消す
  // 後から消そうとすると、同じページで判断timeを作った場合に行数がずれて違う箇所を削除してしまう
  await deleteLines(start, end - start + 1);

  // 書き込む
  const { render, dispose } = useStatusBar();
  const spinner = makeSpinner();
  render(spinner, `writing ${tasks.length} tasks...`);

  let count = 0;
  let failed = false;
  for await (const result of pushTasks(project, ...tasks)) {
    if (result.state !== "fulfilled") {
      console.error(result.reason);
      failed = true;
      continue;
    }
    count += result.value.size;
    // 書き込み状況を.status-barに表示する
    render(spinner, `writing ${tasks.length - count} tasks...`);
  }

  if (failed) {
    render(makeExclamationTriangle(), `Some tasks failed to be written`);
    // 削除した選択範囲を復元する
    await insertLine(start, selectedLines.join("\n"));

    await sleep(1000);
    dispose();
    return;
  }
  render(makeCheckCircle(), "wrote");
  await sleep(1000);
  dispose();
}

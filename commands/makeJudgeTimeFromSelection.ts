import { pushTasks } from "../pushTasks.ts";
import type { Task } from "../task.ts";
import { getLineRange } from "./getLineRange.ts";
import { sleep } from "../lib/sleep.ts";
import { getLines } from "../lib/node.ts";
import {
  makeCheckCircle,
  makeExclamationTriangle,
  makeSpinner,
  useStatusBar,
} from "../lib/statusBar.ts";
import { differenceInMinutes, isSameDay } from "../deps/date-fns.ts";
import { joinPageRoom } from "../deps/scrapbox.ts";
import type { Scrapbox } from "../deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

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
  const stacks = getLines().slice(start, end)
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
      if (differenceInMinutes(stacks[i].start, date) < 180) continue;
      // stacksからtaskに移動する
      const [{ name }] = stacks.splice(i, 1);
      task.lines.push(`  ${name}`);

      i--;
    }

    tasks.push(task);
  }

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
    await sleep(1000);
    dispose();
    return;
  }
  render(makeCheckCircle(), "wrote");

  // 書き込みに成功したら、選択した行を全部消す
  const { patch, cleanup } = await joinPageRoom(
    scrapbox.Project.name,
    scrapbox.Page.title ?? "",
  );
  count = 0;
  await patch((lines) =>
    lines.flatMap((line, i) => start <= i && i <= end ? [] : [line.text])
  );
  cleanup();
  dispose();
}

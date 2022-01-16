import { pushTasks } from "../pushTasks.ts";
import { toDate } from "../diary.ts";
import { parse } from "../task.ts";
import { sleep } from "../lib/sleep.ts";
import {
  makeCheckCircle,
  makeExclamationTriangle,
  makeSpinner,
  useStatusBar,
} from "../lib/statusBar.ts";
import { getIndentLineCount } from "../lib/text.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { getPage, joinPageRoom } from "../deps/scrapbox.ts";

export async function transport(project: string, title: string) {
  const result = await getPage(project, title);
  if (!result.ok) {
    throw result;
  }
  const date = toDate(title);
  const { lines } = result;

  // 日付ページの場合は、その日付と一致しないタスクを転送する
  // 日付ベージでなければ、全てのタスクを転送する
  const tasks = lines.flatMap((line, i) => {
    const count = getIndentLineCount(i, lines);
    const task_ = parse(line.text);
    if (!task_) return [];
    const task = {
      ...task_,
      lines: lines.slice(i + 1, i + 1 + count).map((line) => line.text),
    };
    if (date && isSameDay(task.base, date)) return [];

    return [task];
  });

  // タスクを書き込む
  const { render, dispose } = useStatusBar();
  const spinner = makeSpinner();
  render(spinner, `copying ${tasks.length} tasks...`);

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
    render(spinner, `copying ${tasks.length - count} tasks...`);
  }

  if (failed) {
    render(makeExclamationTriangle(), `Some tasks failed to be written`);
    await sleep(1000);
    dispose();
    return;
  }
  render(makeCheckCircle(), "copied");
  await sleep(500);

  // 書き込みに成功したときのみ、元ページからタスクを消す
  render(spinner, `removing ${tasks.length} original tasks...`);
  const { patch, cleanup } = await joinPageRoom(project, title);
  count = 0;
  await patch((lines) =>
    lines.flatMap((line, i) => {
      if (count > 0) {
        count--;
        return [];
      }
      const task = parse(line.text);
      if (!task || (task && date && isSameDay(task.base, date))) {
        return [line.text];
      }
      count = getIndentLineCount(i, lines);
      return [];
    })
  );
  cleanup();
  render(makeCheckCircle(), "Moved");
  await sleep(1000);
  dispose();
}

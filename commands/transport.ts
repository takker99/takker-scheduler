import { pushTasks } from "../pushTasks.ts";
import { toDate } from "../diary.ts";
import { parse } from "../task.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { getPage } from "../deps/scrapbox.ts";
import {
  makeCheckCircle,
  makeExclamationTriangle,
  makeSpinner,
  useStatusBar,
} from "../lib/statusBar.ts";

export async function transport(project: string, title: string) {
  const result = await getPage(project, title);
  if (!result.ok) {
    throw result;
  }
  const date = toDate(title);
  const { lines } = result;

  // 日付ページの場合は、その日付と一致しないタスクを転送する
  // 日付ベージでなければ、全てのタスクを転送する
  const tasks = lines.flatMap((line) => {
    const task = parse(line.text);
    return task && date && isSameDay(task.base, date) ? [] : task ? [task] : [];
  });

  // タスクを書き込む
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

  // 一秒間完了メッセージを出す
  if (failed) {
    render(makeExclamationTriangle(), `Some tasks failed to be written`);
  } else {
    render(makeCheckCircle(), "wrote");
  }
  setTimeout(dispose, 1000);
}

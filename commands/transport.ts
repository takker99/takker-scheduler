import { pushTasks } from "../pushTasks.ts";
import { toDate } from "../diary.ts";
import { parseBlock, parseLines, TaskBlock, toString } from "../task.ts";
import { isString } from "../utils.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { getPage, sleep } from "../deps/scrapbox-std.ts";
import { useStatusBar } from "../deps/scrapbox-std-dom.ts";
import { disconnect, makeSocket, patch } from "../deps/scrapbox-websocket.ts";

export interface TransportProps {
  /** ここで指定したページからタスクを転送する */
  from: {
    project: string;
    title: string;
  };
  /** 転送先プロジェクト */
  to: string;
}
/** 指定したページからタスクを日付ページに転送する */
export const transport = async (
  { from: { project, title }, to }: TransportProps,
): Promise<void> => {
  const result = await getPage(project, title);
  if (!result.ok) {
    throw result.value;
  }
  const date = toDate(title);
  const { lines } = result.value;

  // 日付ページの場合は、その日付と一致しないタスクを転送する
  // 日付ベージでなければ、全てのタスクを転送する
  const tasks = [] as TaskBlock[];
  for (const task of parseBlock(lines)) {
    if (date && isSameDay(task.base, date)) continue;
    tasks.push(task);
  }

  // タスクを書き込む
  const { render, dispose } = useStatusBar();
  render({ type: "spinner" }, {
    type: "text",
    text: `copying ${tasks.length} tasks...`,
  });

  const socket = await makeSocket();
  try {
    let count = 0;
    let failed = false;
    for await (const result of pushTasks(to, tasks, { socket })) {
      if (result.state !== "fulfilled") {
        console.error(result.reason);
        failed = true;
        continue;
      }
      count += result.value.size;
      // 書き込み状況を.status-barに表示する
      render({ type: "spinner" }, {
        type: "text",
        text: `copying ${tasks.length - count} tasks...`,
      });
    }

    if (failed) {
      render({ type: "exclamation-triangle" }, {
        type: "text",
        text: "Some tasks failed to be written",
      });
      return;
    }

    // 書き込みに成功したときのみ、元ページからタスクを消す
    render({ type: "spinner" }, {
      type: "text",
      text: `Copied. removing ${tasks.length} original tasks...`,
    });
    await patch(project, title, (lines) => {
      const newLines = [] as string[];
      for (const line of parseLines(lines)) {
        if (isString(line)) {
          newLines.push(line);
          continue;
        }
        if ((date && isSameDay(line.base, date))) {
          newLines.push(toString(line), ...line.lines);
        }
      }
      return newLines;
    }, { socket });

    render({ type: "check-circle" }, { type: "text", text: "Moved" });
  } finally {
    await disconnect(socket);
    await sleep(1000);
    dispose();
  }
};

import { TaskBlock, toString } from "./task.ts";
import { format, toTitle } from "./diary.ts";
import { oneByOne, OneByOneResult } from "./utils.ts";
import { isSameDay } from "./deps/date-fns.ts";
import { patch, Socket } from "./deps/scrapbox-websocket.ts";

export interface PushTasksOptions {
  socket: Socket;
}
export interface PushTasksResult {
  /** 書き込み先の日付ページの日付 */ date: Date;
  /** 書き込んだタスクの数 */ size: number;
}
/** 任意個のタスクを特定プロジェクトの日付ページに書き込む
 *
 * @param project 書き込み先プロジェクト
 * @param tasks 書き込むタスク (インデントでぶら下げた行をlinesに入れられる)
 * @param socket 書き込みに使うSocket
 * @return 書き込みの成否が入ったasync iterator
 */
export async function* pushTasks(
  project: string,
  tasks: readonly TaskBlock[],
  init: PushTasksOptions,
): AsyncGenerator<OneByOneResult<PushTasksResult>, void, void> {
  const stacks = [...tasks];
  const promises = [] as Promise<PushTasksResult>[];
  while (stacks.length > 0) {
    const task = stacks.shift();
    if (!task) break;

    // taskと同じ日付のtaskを集める
    const date = task.base;
    const tasks_ = [task];
    for (let i = 0; i < stacks.length; i++) {
      if (!isSameDay(stacks[i].base, date)) continue;
      // stacksからtasks_に移動する
      tasks_.push(...stacks.splice(i, 1));
      i--;
    }

    // 非同期に書き込む

    promises.push((async () => {
      await patch(project, toTitle(date), (lines) =>
        format([
          ...lines.map((line) => line.text),
          ...tasks_.flatMap((task) => [toString(task), ...task.lines ?? []]),
        ]), init);
      return { date, size: tasks_.length };
    })());
  }

  // 書き込みの成否と書き込み先の日付を返す
  yield* oneByOne(promises);
}

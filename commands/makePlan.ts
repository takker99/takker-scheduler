import { format, toTitle } from "../diary.ts";
import { toString } from "../task.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { readProgrammableTasks } from "../plan.ts";
import { openInTheSameTab, Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { disconnect, makeSocket, patch } from "../deps/scrapbox-websocket.ts";
declare const scrapbox: Scrapbox;

/** 指定した日付の日付ページを作成する。もしその中に今日の日付ページが含まれていたら、そのページを開く
 *
 * 複数作成可能。
 *
 * @param dates 作成したい日付のリスト
 * @param project 日付ページを作成するproject
 */
export async function* makePlan(
  dates: Iterable<Date>,
  project: string,
): AsyncGenerator<{ message: string; lines: string[] }, void, unknown> {
  // backgroundでページを追記作成する
  const socket = await makeSocket();

  for (const date of dates) {
    const title = toTitle(date);
    const lines: string[] = [];
    for await (const tasks of readProgrammableTasks(date)) {
      lines.push(...tasks.map((task) => toString(task)));
    }

    await patch(
      project,
      title,
      (oldLines) => format([...oldLines.map((line) => line.text), ...lines]),
      { socket },
    );

    yield { message: `Created "/${project}/${title}"`, lines };
  }

  await disconnect(socket);

  // 今日の日付ページがあったら現在のタブで開く
  const now = new Date();
  if (![...dates].some((date) => isSameDay(date, now))) return;
  if (project !== scrapbox.Project.name) return;
  openInTheSameTab(scrapbox.Project.name, toTitle(now));
}

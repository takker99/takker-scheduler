import { toTitle } from "../diary.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { makeDiaryPages } from "../plan.ts";
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
export async function* makePlan(dates: Iterable<Date>, project: string) {
  // backgroundでページを追記作成する
  const socket = await makeSocket();
  for await (const { lines } of makeDiaryPages(dates)) {
    await patch(
      project,
      lines[0],
      (oldLines) => [...oldLines.map((line) => line.text), ...lines.slice(1)],
      { socket },
    );
    yield { message: `Created "/${project}/${lines[0]}"`, lines };
  }
  await disconnect(socket);

  // 今日の日付ページがあったら現在のタブで開く
  const now = new Date();
  if (![...dates].some((date) => isSameDay(date, now))) return;
  if (project !== scrapbox.Project.name) return;
  openInTheSameTab(scrapbox.Project.name, toTitle(now));
}

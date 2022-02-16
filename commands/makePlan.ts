import { toTitle } from "../diary.ts";
import { isSameDay } from "../deps/date-fns.ts";
import { makeDiaryPages } from "../plan.ts";
import { openInTheSameTab, patch } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox.ts";
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
  for await (const { lines } of makeDiaryPages(dates)) {
    await patch(
      project,
      lines[0],
      (oldLines) => [...oldLines.map((line) => line.text), ...lines.slice(1)],
    );
    yield { message: `Created "/${project}/${lines[0]}"`, lines };
  }

  // 今日の日付ページがあったら現在のタブで開く
  const now = new Date();
  if (![...dates].some((date) => isSameDay(date, now))) return;
  if (project !== scrapbox.Project.name) return;
  openInTheSameTab(scrapbox.Project.name, toTitle(now));
}

import { toTitle } from "../diary.ts";
import { eachDayOfInterval, isAfter } from "../deps/date-fns.ts";
import { getDatesFromSelection } from "../utils.ts";
import { SyncInit, syncPages } from "../sync.ts";
import type { Scrapbox } from "../deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

/** 選択範囲に含まれる日付の日付ページにある全てのタスクをcalendarに登録する
 *
 * ２つ以上の日付が含まれていたら、最初と最後の日付の期間中の全ての日付を対象とする
 * @param init 登録先calendar IDを入れるobject
 */
export async function syncFromSelection(init: SyncInit) {
  const dates = [...getDatesFromSelection()];
  if (dates.length === 0) return;
  if (dates.length === 1) {
    await syncPages(
      [{ project: scrapbox.Project.name, title: toTitle(dates[0]) }],
      init,
    );
    return;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  await syncPages(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ).map((date) => ({ project: scrapbox.Project.name, title: toTitle(date) })),
    init,
  );
}

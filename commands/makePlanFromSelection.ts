import { eachDayOfInterval, isAfter } from "../deps/date-fns.ts";
import { getDatesFromSelection } from "../getDatesFromSelection.ts";
import { makePlan } from "./makePlan.ts";

/** 選択範囲に含まれる日付の日付ページを全て作成する
 *
 * ２つ以上の日付が含まれていたら、最初と最後の日付の期間中の全ての日付を対象とする
 *
 * @param project 日付ページを作成するproject
 */
export async function* makePlanFromSelection(
  project: string,
): AsyncGenerator<{ message: string; lines: string[] }, void, unknown> {
  const dates = [...getDatesFromSelection()];
  if (dates.length === 0) return;
  if (dates.length === 1) {
    yield* makePlan(
      dates,
      project,
    );
    return;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  yield* makePlan(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ),
    project,
  );
}

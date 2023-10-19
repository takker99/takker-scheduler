import { Period } from "../howm/Period.ts";
import { getEnd, Log } from "../howm/Period.ts";
import { fromDate, isBefore } from "../howm/localDate.ts";
import { Status } from "../howm/status.ts";

/** 予定表用に修正したEvent object */
export interface Event {
  /** event name */
  name: string;

  /** 実行日時
   *
   * タスクリンクの場合のみ存在
   */
  executed?: Period;

  /** タスクの状態
   *
   * タスクリンクの場合のみ存在
   */
  status?: Status;

  /** タスクラインに印字された予定開始日時 */
  plan: Period;

  /** 実績開始日時と消費時間 */
  record?: Log;

  /** 取得元project
   *
   * リンクを作るために必要
   */
  project: string;
}

/** タスクリンクなら`true` */
export const isLink = (
  event: Event,
): event is Omit<Event, "executed"> & { executed: Period } =>
  event.executed !== undefined;

/** 記録が終了したタスクなら`true` */
export const isLogged = (event: Event): boolean =>
  event.record?.duration !== undefined;

/** 現在時刻から決定されるタスクの状態
 *
 * - done: 完了
 * - expired: 時間切れ
 * - moved: 未来に予定をずらした
 * - undone: 未完了
 */
export type EventStatus = "done" | "moved" | "undone" | "expired";

/** 現在時刻をもとにタスクの状態を決める */
export const getEventStatus = (
  event: Event,
  now: Date,
): EventStatus => {
  if (event.status === "done") return event.status;
  if (isLogged(event)) {
    return isLink(event)
      // リンクが未完了状態のタスクリンクは、現在時刻以降に開始日時がずらされているならmovedとする
      ? isBefore(fromDate(now), event.executed.start) ? "moved" : "expired"
      : "done";
  }
  return isBefore(getEnd(event.plan), fromDate(now))
    // リンクなしタスクは、実行したかどうかに関わらず、終了日時が過ぎていればdoneとする
    ? isLink(event) ? "expired" : "done"
    : "undone";
};

/** 現在時刻からEventのやり残し時間を求める */
export const getRemains = (event: Event, now: Date): number => {
  const status = getEventStatus(event, now);
  if (status === "done" || status === "moved") return 0;
  return event.plan.duration;
};

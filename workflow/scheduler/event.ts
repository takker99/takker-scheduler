import { differenceInMinutes } from "../../deps/date-fns.ts";
import { Period } from "../../howm/Period.ts";
import { getEnd, Log } from "../../howm/Period.ts";
import { fromDate, isBefore } from "../../howm/localDate.ts";
import {
  Event as HowmEvent,
  getLinkTitle,
  isReminder,
  parse,
} from "../../howm/parse.ts";
import { Status } from "../../howm/status.ts";
import { Task as TaskLine } from "../../task.ts";
import { Path } from "../path.ts";

/** 予定表用に修正したEvent object */
export type Event = PlainEvent | EventWithLink;

/** task nameがタスクリンクでないときのEvent */
export interface PlainEvent {
  /** event name */
  name: string;

  /** タスクラインに印字された予定開始日時 */
  plan: Period;

  /** 実績開始日時と消費時間 */
  record?: Log;
}

/** task nameがタスクリンクだったときのEvent */
export interface EventWithLink extends PlainEvent, Path {
  /** 実行日時 */
  executed?: Period;

  /** タスクの状態 */
  status?: Status;
}

/** タスクリンクなら`true` */
export const isLink = (
  event: Event,
): event is EventWithLink => "title" in event;

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
  if (isLink(event) && event.status === "done") return event.status;
  if (isLogged(event)) {
    return isLink(event) && event.executed
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

/** TaskLineからEventを生成する
 *
 * - 予定開始日時のないTaskLineは変換対象外
 * - task nameがタスクリンクの場合でも、TaskLineから得た予定開始日時を使ってEventを生成する
 *
 * @param task TaskLine
 * @param project project name, タスクリンクのパスを作るときに使う
 * @return `Event`, 予定開始日時がないTaskLineのときは`undefined`
 */
export const fromTaskLine = (
  task: TaskLine,
  project: string,
): Event | undefined => {
  // タスクリンクだった場合を考慮して、[]分を外して解析する
  // 解析できなかった場合は[]を外す前のを使うので問題ない
  const result = parse(task.title.slice(1, -1));

  // 予定開始日時があるもののみ対象とする
  if (!task.plan.start) return;

  const event: PlainEvent = {
    name: result?.ok ? result.value.name : task.title,
    plan: {
      start: fromDate(task.plan.start),
      duration: (task.plan.duration ?? 0) / 60,
    },
  };
  // optional parametersを埋めていく
  if (task.record.start) {
    event.record = {
      start: fromDate(task.record.start),
    };
    if (task.record.end) {
      event.record.duration = differenceInMinutes(
        task.record.end,
        task.record.start,
      );
    }
  }
  if (!result?.ok) return event;

  const eventWithLink: EventWithLink = {
    ...event,
    title: result.value.raw,
    project,
  };
  if (result.value.freshness) {
    eventWithLink.status = result?.value.freshness.status;
  }
  if (!isReminder(result.value)) {
    eventWithLink.executed = result.value.executed;
  }
  return eventWithLink;
};

/** howmのEventからEventを生成する */
export const fromHowmEvent = (
  event: HowmEvent,
  project: string,
): Event => {
  const title = getLinkTitle(event);

  return title !== undefined
    ? {
      name: event.name,
      project,
      title,
      executed: event.executed,
      plan: event.executed,
      status: event.freshness?.status,
    }
    : {
      name: event.name,
      plan: event.executed,
    };
};

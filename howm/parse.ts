import {
  addMinutes,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
} from "../deps/date-fns.ts";
import { isNumber, Result } from "../deps/scrapbox-std.ts";
import { Period } from "./Period.ts";
import { Freshness } from "./freshness.ts";
import {
  format,
  fromDate,
  isBefore,
  isLocalDateTime,
  LocalDate,
  LocalDateTime,
  toDate,
} from "./localDate.ts";
import { Recurrence, toFrequency } from "./recurrence.ts";
import { fromStatus, toStatus } from "./status.ts";

export interface Reminder {
  /** task name */
  name: string;

  /** 旬度 */
  freshness: Freshness;

  /** 見積もり用日時
   *
   * 所要時間 (min)か終了日時のどちらか
   */
  estimated?: number | LocalDate | LocalDateTime;

  /** 解析前の文字列 */
  raw: string;
}

/** 予定 (開始日時と終了日時が確定したアイテム)を表す */
export interface Event {
  /** event name */
  name: string;

  /** 旬度 */
  freshness?: Freshness;

  /** 実行日時 */
  executed: Period;

  /** 繰り返し情報 */
  recurrence?: Recurrence;

  /** 解析前の文字列 */
  raw: string;
}

export type Task = Reminder | Event;

export interface TaskRangeError {
  name: "TaskRangeError";
  message: string;
}

export interface InvalidDateError {
  name: "InvalidDateError";
  message: string;
}

/** Taskを解析する
 *
 * @param text Taskの文字列
 * @return 解析結果。Taskでなければ`undefined`を返す
 */
export const parse = (
  text: string,
): Result<Task, TaskRangeError | InvalidDateError> | undefined => {
  const matched = text.match(
    /(?:([\+\-!~.])(\d+)?)?@(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?(?:\/(\d{2}):(\d{2})|\/(?:(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)|D(\d+))?(?:R([YMWD])?(\d+))?(?:@(?:(\d{2}):(\d{2})|(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)?(?:\/(\d{2}):(\d{2})|\/(?:(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)|D(\d+))?)?/i,
  );
  if (!matched) return;

  const [
    matchedText,
    statusSym,
    speedStr,
    syear,
    smonth,
    sdate,
    shours,
    sminutes,
    ehours2,
    eminutes2,
    eyear,
    emonth,
    edate,
    ehours,
    eminutes,
    durationStr,
    symbol,
    countStr,
    sshours2,
    ssminutes2,
    ssyear,
    ssmonth,
    ssdate,
    sshours,
    ssminutes,
    eehours2,
    eeminutes2,
    eeyear,
    eemonth,
    eedate,
    eehours,
    eeminutes,
    durationStr2,
  ] = matched;

  /** task name */
  const name = `${text.slice(0, matched.index).trim()}${
    text.slice((matched.index ?? 0) + matchedText.length).trim()
  }`;

  /** 旬度計算の起点 */
  const refDate = fixStart(syear, smonth, sdate, shours, sminutes);
  if (!isValid(toDate(refDate))) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: `The reference point of the task "${
          format(refDate)
        }" is an invalid date.`,
      },
    };
  }

  /** 見積もり時間 */
  const estimated = fixEnd(
    refDate,
    eyear,
    emonth,
    edate,
    ehours2 || ehours,
    eminutes2 || eminutes,
    durationStr,
  );
  if (estimated !== undefined) {
    if (
      (isNumber(estimated) && isNaN(estimated)) ||
      (!isNumber(estimated) && !isValid(toDate(estimated)))
    ) {
      return {
        ok: false,
        value: {
          name: "InvalidDateError",
          message: `The estimated end of the task${
            isNumber(estimated) ? "" : ` "${format(estimated)}"`
          } is an invalid date.`,
        },
      };
    }
    if (
      (isNumber(estimated) && estimated < 0) ||
      (!isNumber(estimated) && isBefore(estimated, refDate))
    ) {
      return {
        ok: false,
        value: {
          name: "TaskRangeError",
          message:
            `The reference point of an task cannot be after its estimated end.\n\nreference point:${
              format(refDate)
            }\nestimated end:${
              format(
                isNumber(estimated)
                  ? fromDate(addMinutes(toDate(refDate), estimated))
                  : estimated,
              )
            }`,
        },
      };
    }
  }

  // 後方互換性用コード
  // 先頭が✅か❌のときは、`done`とみなす
  /** task status */
  const status = /^[\uFE00-\uFE0F]*[✅❌]/.test(text)
    ? "done"
    : toStatus(statusSym);
  const freshness: Freshness | undefined = status
    ? { status, refDate }
    : undefined;
  if (freshness && speedStr) freshness.speed = parseInt(speedStr);

  // 実行日時の取得を試みる
  /** 開始日時 */
  const start = fixStart(
    ssyear || syear,
    ssmonth || smonth,
    ssdate || sdate,
    sshours2 || sshours || shours,
    ssminutes2 || ssminutes || sminutes,
  );
  if (!isValid(toDate(start))) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: `The start of the task/event "${
          format(start)
        }" is an invalid date.`,
      },
    };
  }

  /** 所要時間 */
  const duration = fixEnd(
    start,
    eeyear || eyear,
    eemonth || emonth,
    eedate || edate,
    eehours2 || eehours || ehours2 || ehours,
    eeminutes2 || eeminutes || eminutes2 || eminutes,
    durationStr2 || durationStr,
  );

  const executed: Period | undefined =
    isLocalDateTime(start) && isNumber(duration)
      ? { start, duration }
      : undefined;

  // Eventとみなせる場合
  if (executed) {
    const event: Event = {
      name,
      executed,
      raw: text,
    };
    if (freshness) event.freshness = freshness;
    if (symbol || countStr) {
      event.recurrence = {
        frequency: toFrequency(symbol ?? "D") ?? "daily",
        count: countStr ? parseInt(countStr) : 1,
      };
    }
    return { ok: true, value: event };
  }

  if (!freshness) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: "Task requires freshness to be spec",
      },
    };
  }

  // この条件ではReminder以外ありえない
  const task: Reminder = {
    name,
    freshness,
    raw: text,
  };
  if (estimated) task.estimated = estimated;
  return { ok: true, value: executed ? { ...task, executed } : task };
};

/** Reminderかどうか調べる */
export const isReminder = <R extends Reminder>(task: Task): task is R =>
  task.freshness !== undefined && !("executed" in task);

/** 終日タスクかどうか判定する
 *
 * `start`に時刻が含まれていないタスクは全て終日タスクだとみなす
 */
export const isAllDay = (
  task:
    | Pick<Reminder, "freshness" | "estimated">
    | Pick<Event, "executed">,
): boolean =>
  !("executed" in task ||
    ("freshness" in task && isLocalDateTime(task.freshness.refDate) &&
      task.estimated &&
      (isNumber(task.estimated) || isLocalDateTime(task.estimated))));

/** タスクの所要時間を分単位で得る
 *
 * 所要時間が設定されていない場合は`undefined`を返す
 */
export const getDuration = (
  task: Pick<Reminder, "estimated"> | Pick<Event, "executed">,
): number | undefined =>
  "executed" in task
    ? task.executed.duration
    : isNumber(task.estimated)
    ? task.estimated
    : undefined;

export const getStart = (task: Task): LocalDate | LocalDateTime =>
  !isReminder(task) ? task.executed.start : task.freshness.refDate;

/** タスクの終了日時を得る
 *
 * 終日の場合は、最終日の翌日0時を終了日時とする
 */
export const getEnd = (task: Task): LocalDateTime => {
  if (!isReminder(task)) {
    const end = toDate(task.executed.start);
    end.setMinutes(end.getMinutes() + task.executed.duration);
    return fromDate(end);
  }
  if (
    isNumber(task.estimated) && isLocalDateTime(task.freshness.refDate)
  ) {
    const end = toDate(task.freshness.refDate);
    end.setMinutes(end.getMinutes() + task.estimated);
    return fromDate(end);
  }
  const end = toDate(
    isNumber(task.estimated)
      ? task.freshness.refDate
      : task.estimated ?? task.freshness.refDate,
  );
  end.setHours(0);
  end.setMinutes(0);
  end.setDate(end.getDate() + 1);
  return fromDate(end);
};

/** Task objectからタスクリンクの文字列を作る */
export const toString = (task: Task): string => {
  const status = task.freshness
    ? `${fromStatus(task.freshness.status)}${task.freshness.speed ?? ""}`
    : "";
  const base = `${format(getStart(task))}`;
  const duration = getDuration(task);

  return `${status}@${base}${
    duration === undefined ? "" : `D${duration}`
  }${task.name}`;
};

/** 指定日に繰り返す繰り返しタスクか調べる。
 *
 * 繰り返す場合はそのタスクを指定日の日付で生成する。
 * 繰り返さない場合は`undefined`を返す
 */
export const makeRepeat = (
  event: Event,
  date: Date,
): Event | undefined => {
  if (!event.recurrence) return;
  const localDate = fromDate(date);

  const { recurrence, executed } = event;
  // 繰り返す場合のみ通過させる
  switch (recurrence.frequency) {
    case "yearly": {
      // 間隔があっているかチェック
      if (
        Math.abs(localDate.year - executed.start.year) %
            (recurrence.count ?? 1) !== 0
      ) return;

      // 日と月が一致しているかチェック
      if (
        executed.start.month !== localDate.month ||
        executed.start.date !== localDate.date
      ) return;

      break;
    }
    case "monthly": {
      /** 与えられた日付とeventの繰り返し起点との月差 */
      const diff = differenceInCalendarMonths(
        toDate(localDate),
        toDate(executed.start),
      );
      if (diff % (recurrence.count ?? 1) !== 0) return;

      break;
    }
    case "weekly":
    case "daily": {
      const interval = recurrence.frequency === "weekly" ? 7 : 1;
      const diff = differenceInCalendarDays(
        toDate(localDate),
        toDate(executed.start),
      );
      if (diff % ((recurrence.count ?? 1) * interval) !== 0) return;

      break;
    }
  }

  const start: LocalDateTime = { ...executed.start };
  start.year = localDate.year;
  start.month = localDate.month;
  start.date = localDate.date;

  const generated: Event = {
    name: event.name,
    executed: { start, duration: executed.duration },
    raw: event.raw,
  };
  if (event.freshness) generated.freshness = event.freshness;
  return generated;
};

/** 開始日時補正データから最終的な開始日時を決定する
 *
 * 与えられた文字列は正しい数値であることを前提とし、この函数では一切エラー処理しない
 */
const fixStart = (
  syear: string,
  smonth: string,
  sdate: string,
  shours: string,
  sminutes: string,
): LocalDate | LocalDateTime => {
  const year = parseInt(syear);
  const month = parseInt(smonth);
  const date = parseInt(sdate);
  const hours = shours ? parseInt(shours) : undefined;
  const minutes = sminutes ? parseInt(sminutes) : undefined;

  return hours !== undefined && minutes !== undefined
    ? { year, month, date, hours, minutes }
    : { year, month, date };
};

/** 終了日時補正データから最終的な終了日時を決定する
 *
 * 与えられた文字列は正しい数値であることを前提とし、この函数では一切エラー処理しない
 *
 * @return 所要時間を渡されたか、開始時刻と終了時刻ともに明記されている場合は、所要時間 (min) を`number`で返す。終了日時指定がない場合は`undeifned`を返す。それ以外は`LocalDate | LocalDateTime`を返す
 */
const fixEnd = (
  baseStart: LocalDate | LocalDateTime,
  eyear: string,
  emonth: string,
  edate: string,
  ehours: string,
  eminutes: string,
  durationStr: string,
): number | LocalDate | LocalDateTime | undefined => {
  if (!eyear && !emonth && !edate && !ehours && !eminutes && !durationStr) {
    return undefined;
  }

  // 所要時間が直接指定されていれば、それを優先する
  if (durationStr) return parseInt(durationStr);

  const year = eyear ? parseInt(eyear) : baseStart.year;
  const month = emonth ? parseInt(emonth) : baseStart.month;
  const date = edate ? parseInt(edate) : baseStart.date;
  const hours = ehours ? parseInt(ehours) : undefined;
  const minutes = eminutes ? parseInt(eminutes) : undefined;

  const end: LocalDate | LocalDateTime =
    hours !== undefined && minutes !== undefined
      ? { year, month, date, hours, minutes }
      : { year, month, date };

  // 所要時間を計算できない場合
  if (!isLocalDateTime(baseStart) || !isLocalDateTime(end)) return end;

  return Math.round(
    (toDate(end).getTime() - toDate(baseStart).getTime()) / (60 * 1000),
  );
};

import {
  addMinutes,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
} from "../deps/date-fns.ts";
import { isNumber, Result } from "../deps/scrapbox-std.ts";
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
import { fromStatus, Status, toStatus } from "./status.ts";

/* いずれ実装する
/** 曜日指定情報を加えたDate *
export interface ExDate {
  base: Date;
  startOfDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekNum: number;
}
*/
export interface Reminder {
  /** task name */
  name: string;

  /** howm記号 */
  status: Status;

  /** hown記号のオプション */
  speed?: number;

  /** 開始日時 */
  start: LocalDate | LocalDateTime;

  /** 終了日時 */
  end?: LocalDate | LocalDateTime;

  /** 所要時間 (単位はmin) **/
  duration?: number;

  /** 解析前の文字列 */
  raw: string;
}

/** 予定 (開始日時と終了日時が確定したアイテム)を表す */
export interface Event {
  /** event name */
  name: string;

  /** howm記号 */
  status?: Status;

  /** hown記号のオプション */
  speed?: number;

  /** 開始日時 */
  start: LocalDateTime;

  /** 終了日時 */
  end: LocalDateTime;

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
        message: `The start of the task "${format(start)}" is an invalid date.`,
      },
    };
  }

  /** 終了日時 or 所要時間 */
  const end = fixEnd(
    start,
    eeyear || eyear,
    eemonth || emonth,
    eedate || edate,
    eehours2 || eehours || ehours2 || ehours,
    eeminutes2 || eeminutes || eminutes2 || eminutes,
    durationStr || durationStr2,
  );
  if (end && !isNumber(end)) {
    if (!isValid(toDate(end))) {
      return {
        ok: false,
        value: {
          name: "InvalidDateError",
          message: `The end of the task "${format(end)}" is an invalid date.`,
        },
      };
    }
    if (isBefore(end, start)) {
      return {
        ok: false,
        value: {
          name: "TaskRangeError",
          message: `The start of an task cannot be after its end.\n\nstart:${
            format(start)
          }\nend:${format(end)}`,
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

  // Eventとみなせる場合
  if (
    isLocalDateTime(start) && end && (isNumber(end) || isLocalDateTime(end))
  ) {
    const end_ = isNumber(end) ? fromDate(addMinutes(toDate(start), end)) : end;
    const event: Event = {
      name,
      start,
      end: end_,
      raw: text,
    };
    if (status) event.status = status;
    if (speedStr) event.speed = parseInt(speedStr);
    if (symbol || countStr) {
      event.recurrence = {
        frequency: toFrequency(symbol ?? "D") ?? "daily",
        count: countStr ? parseInt(countStr) : 1,
      };
    }
    return { ok: true, value: event };
  }

  if (!status) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: "Task requires status to be spec",
      },
    };
  }

  // この条件ではReminder以外ありえない
  const task: Reminder = {
    name,
    status,
    start,
    raw: text,
  };
  if (speedStr) task.speed = parseInt(speedStr);
  if (end) {
    if (isNumber(end)) {
      task.duration = end;
    } else {
      task.end = end;
    }
  }
  return { ok: true, value: task };
};

/** 終日タスクかどうか判定する
 *
 * `start`に時刻が含まれていないタスクは全て終日タスクだとみなす
 */
export const isAllDay = (task: Pick<Task, "start">): boolean =>
  !("hours" in task.start);

/** タスクの所要時間を分単位で得る
 *
 * 所要時間が設定されていない場合は`undefined`を返す
 */
export const getDuration = (
  task: Pick<Reminder, "start" | "end" | "duration">,
): number | undefined =>
  task.end
    ? isAllDay(task) ? undefined : Math.round(
      (toDate(task.end).getTime() - toDate(task.start).getTime()) / (60 * 1000),
    )
    : task.duration;

/** タスクの終了日時を得る
 *
 * 終日の場合は、最終日の翌日0時を終了日時とする
 */
export const getEnd = (task: Reminder): LocalDateTime => {
  if (task.end) {
    if ("hours" in task.end) return task.end;
    const end = toDate(task.end);
    end.setDate(end.getDate() + 1);
    return fromDate(end);
  }
  if (task.duration === undefined || !("hours" in task.start)) {
    const end = toDate(task.start);
    end.setHours(0);
    end.setMinutes(0);
    end.setDate(end.getDate() + 1);
    return fromDate(end);
  }
  const end = toDate(task.start);
  end.setMinutes(end.getMinutes() + task.duration);
  return fromDate(end);
};

/** Task objectからタスクリンクの文字列を作る */
export const toString = (task: Reminder): string => {
  const duration = getDuration(task);

  return `${fromStatus(task.status)}${task.speed ?? ""}@${format(task.start)}${
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

  const recurrence = event.recurrence;
  // 繰り返す場合のみ通過させる
  switch (event.recurrence.frequency) {
    case "yearly": {
      // 間隔があっているかチェック
      if (
        Math.abs(localDate.year - event.start.year) %
            (recurrence.count ?? 1) !== 0
      ) return;

      // 日と月が一致しているかチェック
      if (
        event.start.month !== localDate.month ||
        event.start.date !== localDate.date
      ) return;

      break;
    }
    case "monthly": {
      /** 与えられた日付とeventの繰り返し起点との月差 */
      const diff = differenceInCalendarMonths(
        toDate(localDate),
        toDate(event.start),
      );
      if (diff % (recurrence.count ?? 1) !== 0) return;

      break;
    }
    case "weekly":
    case "daily": {
      const interval = recurrence.frequency === "weekly" ? 7 : 1;
      const diff = differenceInCalendarDays(
        toDate(localDate),
        toDate(event.start),
      );
      if (diff % ((recurrence.count ?? 1) * interval) !== 0) return;

      break;
    }
  }

  const start: LocalDateTime = { ...event.start };
  start.year = localDate.year;
  start.month = localDate.month;
  start.date = localDate.date;
  const end = fromDate(addMinutes(toDate(start), getDuration(event)!));

  const generated: Event = { name: event.name, start, end, raw: event.raw };
  if (event.status) generated.status = event.status;
  if (event.speed) generated.speed = event.speed;
  return event;
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
 * @return 開始日時が設定してあれば`LocalDateTime`を、そうでなければ所要時間を`number`で、所要時間も設定されていなければ`undefined`を返す
 */
const fixEnd = (
  baseStart: LocalDate | LocalDateTime,
  eyear: string,
  emonth: string,
  edate: string,
  ehours: string,
  eminutes: string,
  durationStr: string,
): LocalDateTime | number | undefined => {
  const year = eyear ? parseInt(eyear) : baseStart.year;
  const month = emonth ? parseInt(emonth) : baseStart.month;
  const date = edate ? parseInt(edate) : baseStart.date;
  const hours = ehours ? parseInt(ehours) : undefined;
  const minutes = eminutes ? parseInt(eminutes) : undefined;

  const end = isLocalDateTime(baseStart)
    ? {
      year,
      month,
      date,
      hours: hours ?? baseStart.hours,
      minutes: minutes ?? baseStart.minutes,
    }
    : hours !== undefined && minutes !== undefined
    ? { year, month, date, hours, minutes }
    : { year, month, date };

  // 終了日時を設定できない場合
  if (!isLocalDateTime(end)) {
    return durationStr ? parseInt(durationStr) : undefined;
  }

  // 所要時間が設定されているとき
  if (durationStr) {
    return fromDate(addMinutes(toDate(end), parseInt(durationStr)));
  }

  return end;
};

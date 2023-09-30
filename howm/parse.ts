import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
} from "../deps/date-fns.ts";
import { Result } from "../deps/scrapbox-std.ts";
import {
  format,
  fromDate,
  isBefore,
  LocalDate,
  LocalDateTime,
  toDate,
} from "./localDate.ts";
import { fromStatus, Status, toStatus } from "./status.ts";

export const toFrequency = (
  symbol: string,
): "yearly" | "monthly" | "weekly" | "daily" | undefined => {
  switch (symbol.toLowerCase()) {
    case "y":
      return "yearly";
    case "m":
      return "monthly";
    case "w":
      return "weekly";
    case "d":
      return "daily";
    default:
      return;
  }
};

export interface Repeat {
  type: "yearly" | "monthly" | "weekly" | "daily";
  count: number;
}

/* いずれ実装する
/** 曜日指定情報を加えたDate *
export interface ExDate {
  base: Date;
  startOfDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekNum: number;
}
*/

export interface Task {
  /** task name */
  name: string;

  /** howm記号 */
  status: Status;

  /** hown記号のオプション */
  speed?: number;

  repeat?: Repeat;

  /** 開始日時 */
  start: LocalDate | LocalDateTime;

  /** 終了日時 */
  end?: LocalDate | LocalDateTime;

  /** 所要時間 (単位はmin) **/
  duration?: number;

  /** 解析前の文字列 */
  raw: string;
}

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
    /(?:([\+\-!~.])(\d+)?)?@(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?(?:\/(\d{2}):(\d{2})|\/(?:(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)|D(\d+))?(?:R([YMWD])?(\d+))?/i,
  );
  if (!matched) return;

  const [
    matchedText,
    statusSym = "",
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
    repeatSym = "D",
    countStr,
  ] = matched;

  /** task name */
  const name = `${text.slice(0, matched.index).trim()}${
    text.slice((matched.index ?? 0) + matchedText.length).trim()
  }`;

  const status_ = toStatus(statusSym);
  // /[\+\-!~.]/以外にマッチするはずがない
  if (!status_) throw Error("status must be +,,-,!,~,.");

  // 後方互換性用コード
  // 先頭が✅か❌のときは、`done`とみなす
  /** task status */
  const status = /^[\uFE00-\uFE0F]*[✅❌]/.test(text) ? "done" : status_;
  const start_: LocalDate = {
    year: parseInt(syear),
    month: parseInt(smonth),
    date: parseInt(sdate),
  };
  /** 開始日時 */
  const start: LocalDate | LocalDateTime = !shours
    ? start_
    : { ...start_, hours: parseInt(shours), minutes: parseInt(sminutes) };
  if (!isValid(toDate(start))) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: `The start of the task "${format(start)}" is an invalid date.`,
      },
    };
  }

  const task: Task = { name, status, start, raw: text };
  if (speedStr) task.speed = parseInt(speedStr);
  if (countStr) {
    const type = toFrequency(repeatSym);
    if (!type) throw Error("`repeat` must be Y,M,W,D");
    task.repeat = { type, count: parseInt(countStr) };
  }
  if (ehours2 || edate) {
    let end: LocalDate | LocalDateTime = {
      year: start.year,
      month: start.month,
      date: start.date,
    };
    if (ehours2) {
      end = { ...end, hours: parseInt(ehours2), minutes: parseInt(eminutes2) };
    } else {
      if (eyear) end.year = parseInt(eyear);
      if (emonth) end.month = parseInt(emonth);
      if (edate) end.date = parseInt(edate);
      if (ehours) {
        end = {
          ...end,
          hours: parseInt(ehours),
          minutes: parseInt(eminutes),
        };
      }
    }
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
    task.end = end;
  }
  if (durationStr) task.duration = parseInt(durationStr);

  return { ok: true, value: task };
};

/** 終日タスクかどうか判定する
 *
 * `start`に時刻が含まれていないタスクは全て終日タスクだとみなす
 */
export const isAllDay = (task: Task): boolean => !("hours" in task.start);

/** タスクの所要時間を分単位で得る
 *
 * 所要時間が設定されていない場合は`undefined`を返す
 */
export const getDuration = (task: Task): number | undefined =>
  task.end
    ? isAllDay(task) ? undefined : Math.round(
      (toDate(task.end).getTime() - toDate(task.start).getTime()) / (60 * 1000),
    )
    : task.duration;

/** タスクの終了日時を得る
 *
 * 終日の場合は、最終日の翌日0時を終了日時とする
 */
export const getEnd = (task: Task): LocalDateTime => {
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
const toString = (task: Task): string => {
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
  task: Task,
  date: LocalDate,
): Task | undefined => {
  if (!task.repeat) return;

  const str = toString(task).replace(
    /@\d{4}-\d{2}-\d{2}/,
    `@${format(date).slice(0, -6)}`,
  );
  const result = parse(str);
  if (!result || !result.ok) throw Error(`"${str}" must be parsed correctly.`);
  const newTask = result.value;

  if (task.repeat.type === "yearly") {
    if (
      Math.abs(date.year - task.start.year) % (task.repeat.count ?? 1) !== 0
    ) return;

    return task.start.month === date.month &&
        task.start.date === date.date
      ? newTask
      : undefined;
  }
  if (task.repeat.type === "monthly") {
    const diff = differenceInCalendarMonths(
      toDate(date),
      toDate(task.start),
    );
    if (diff % (task.repeat.count ?? 1) !== 0) return;

    return task.start.date === date.date ? newTask : undefined;
  }

  const interval = task.repeat.type === "weekly" ? 7 : 1;
  const diff = differenceInCalendarDays(toDate(date), toDate(task.start));
  if (diff % ((task.repeat.count ?? 1) * interval) !== 0) return;

  return newTask;
};

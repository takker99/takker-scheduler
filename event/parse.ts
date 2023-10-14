import {
  addMinutes,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  isValid,
} from "../deps/date-fns.ts";
import { Result } from "../deps/scrapbox-std.ts";
import { format, fromDate, LocalDateTime, toDate } from "../howm/localDate.ts";
import {
  getDuration as getDurationOfTask,
  InvalidDateError,
  parse as parseTask,
  Task,
  TaskRangeError,
} from "../howm/parse.ts";
import { Recurrence, toFrequency } from "./recurrence.ts";

/** 予定 (開始日時と終了日時が確定したアイテム)を表す */
export interface Event {
  /** task name */
  name: string;

  /** 開始日時 */
  start: LocalDateTime;

  /** 終了日時 */
  end: LocalDateTime;

  /** 解析した文字列がタスクでもあった場合は、そのデータを入れる */
  task?: Task;

  recurrence?: Recurrence;

  /** 解析前の文字列 */
  raw: string;
}

export interface LackDateError {
  name: "LackDateError";
  message: string;
}

/** Eventを解析する
 *
 * @param text Eventの文字列
 * @return 解析結果。Eventでなければ`undefined`を返す
 */
export const parse = (
  text: string,
):
  | Result<Event | Task, TaskRangeError | InvalidDateError | LackDateError>
  | undefined => {
  // 省略されたデータはタスクから流用する
  const task = parseTask(text);
  if (task?.ok === false) return task;

  const taskName = task?.value?.name ?? text;
  const matched = taskName.match(
    /@(?:(\d{2}):(\d{2})|(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)?(?:\/(\d{2}):(\d{2})|\/(?:(?:(?:(\d{4})-)?(\d{2})-)?(\d{2})(?:T(\d{2}):(\d{2}))?)|D(\d+))?(?:R([YMWD])?(\d+))?/i,
  );
  // eventでないとき
  if (!matched) return task;

  const [
    matchedText,
    shours2,
    sminutes2,
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
  ] = matched;

  /** task name */
  const name = `${taskName.slice(0, matched.index).trim()}${
    taskName.slice((matched.index ?? 0) + matchedText.length).trim()
  }`;

  const sresult = checkStart(
    shours2,
    sminutes2,
    syear,
    smonth,
    sdate,
    shours,
    sminutes,
    task?.value,
  );
  if (!sresult.ok) return sresult;
  /** 開始日時 */
  const start = sresult.value;
  if (!isValid(toDate(start))) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: `The start of the task "${format(start)}" is an invalid date.`,
      },
    };
  }

  const eresult = checkEnd(
    ehours2,
    eminutes2,
    eyear,
    emonth,
    edate,
    ehours,
    eminutes,
    durationStr,
    start,
    task?.value,
  );
  if (!eresult.ok) return eresult;
  /** 終了日時 */
  const end = eresult.value;
  if (!isValid(toDate(end))) {
    return {
      ok: false,
      value: {
        name: "InvalidDateError",
        message: `The end of the task "${format(end)}" is an invalid date.`,
      },
    };
  }

  const event: Event = { name, start, end, raw: text };
  if (task?.value) event.task = task.value;
  if (countStr) {
    const count = parseInt(countStr);
    const frequency = toFrequency(symbol ?? "D") ?? "daily";
    event.recurrence = { frequency, count };
  }

  return { ok: true, value: event };
};

const checkStart = (
  shours2: string,
  sminutes2: string,
  syear: string,
  smonth: string,
  sdate: string,
  shours: string,
  sminutes: string,
  task?: Task,
): Result<LocalDateTime, LackDateError> => {
  if (shours2) {
    if (!task) {
      return {
        ok: false,
        value: {
          name: "LackDateError",
          message:
            "No start date found in both a task specifier and an event specifier.",
        },
      };
    }
    return {
      ok: true,
      value: {
        year: task.start.year,
        month: task.start.month,
        date: task.start.date,
        hours: parseInt(shours2),
        minutes: parseInt(sminutes2),
      },
    };
  }

  const year = syear ? parseInt(syear) : task?.start?.year;
  const month = smonth ? parseInt(smonth) : task?.start?.month;
  const date = sdate ? parseInt(sdate) : task?.start?.date;
  const hours = shours
    ? parseInt(shours)
    : task?.start && ("hours" in task.start)
    ? task.start.hours
    : undefined;
  const minutes = sminutes
    ? parseInt(sminutes)
    : task?.start && ("minutes" in task.start)
    ? task.start.minutes
    : undefined;
  const target = year === undefined
    ? "year"
    : month === undefined
    ? "month"
    : date === undefined
    ? "date"
    : hours === undefined
    ? "hours"
    : minutes === undefined
    ? "minutes"
    : false;
  if (target) {
    return {
      ok: false,
      value: {
        name: "LackDateError",
        message: `Could not found any "${target}" parameter.`,
      },
    };
  }

  return {
    ok: true,
    value: {
      year: year!,
      month: month!,
      date: date!,
      hours: hours!,
      minutes: minutes!,
    },
  };
};

const checkEnd = (
  ehours2: string,
  eminutes2: string,
  eyear: string,
  emonth: string,
  edate: string,
  ehours: string,
  eminutes: string,
  durationStr: string,
  start: LocalDateTime,
  task?: Task,
): Result<LocalDateTime, LackDateError> => {
  // 終了時刻が設定されているとき
  if (ehours2) {
    return {
      ok: true,
      value: {
        year: start.year,
        month: start.month,
        date: start.date,
        hours: parseInt(ehours2),
        minutes: parseInt(eminutes2),
      },
    };
  }
  // 所要時間が設定されているとき
  if (durationStr) {
    return {
      ok: true,
      value: fromDate(addMinutes(toDate(start), parseInt(durationStr))),
    };
  }
  // eventから終了日時を計算できない場合
  if (!edate) {
    // Taskから所要時間を取得できればそれを使う
    if (task) {
      const duration = getDurationOfTask(task);
      if (duration !== undefined) {
        return {
          ok: true,
          value: fromDate(addMinutes(toDate(start), duration)),
        };
      }
    }
    // 取得できなければエラーを返す
    return {
      ok: false,
      value: {
        name: "LackDateError",
        message:
          "No end date found in both a task specifier and an event specifier.",
      },
    };
  }

  const year = eyear ? parseInt(eyear) : start.year;
  const month = emonth ? parseInt(emonth) : start.month;
  const date = edate ? parseInt(edate) : start.date;
  const hours = ehours ? parseInt(ehours) : start.hours;
  const minutes = eminutes ? parseInt(eminutes) : start.minutes;

  return { ok: true, value: { year, month, date, hours, minutes } };
};

/** 指定日に繰り返す繰り返しタスクか調べる。
 *
 * 繰り返す場合はそのタスクを指定日の日付で生成する。
 * 繰り返さない場合は`undefined`を返す
 */
export const makeRepeat = (
  event: Event,
  date: Date,
): Task | Event | undefined => {
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

  // dateの日付を使ってTask or Eventを生成する
  const newEvent = structuredClone(event);

  newEvent.start.year = localDate.year;
  const duration = getDuration(newEvent);
  if (newEvent.task) {
    const task = newEvent.task;
    delete task.end;
    task.duration = duration;
    return task;
  }
  newEvent.end = fromDate(addMinutes(toDate(newEvent.start), duration));
  return newEvent;
};

/** Eventの長さを分単位で返す */
export const getDuration = (event: Event): number =>
  Math.round(
    (toDate(event.end).getTime() - toDate(event.start).getTime()) / 60 * 1000,
  );

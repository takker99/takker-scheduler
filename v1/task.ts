import { addSeconds, isAfter, lightFormat, set } from "../deps/date-fns.ts";
import { isNone, isString } from "../utils.ts";
import { getIndentLineCount } from "../deps/scrapbox-std.ts";
import { all, map, match, or, parse, text } from "jsr:@takker/parser@0.1";

export type Interval = {
  start?: Date;
  end?: Date;
};
/** ミリ秒単位の経過時間 */
export type Duration = number;
/** task data */
export interface Task {
  title: string;
  base: Date;
  plan: {
    start?: Date;
    /** 見積もり時間 単位は秒 */ duration?: number;
  };
  record: Interval;
}

const backquote = text("`");
const hyphen = text("-");
const colon = text(":");
const nnnn = map(match(/\d{4}/), parseInt);
const nn = map(match(/\d{2}/), parseInt);
const date = map(
  all(nnnn, hyphen, nn, hyphen, nn),
  ([year, , month, , date]) => new Date(year, month - 1, date),
);
const hhmm = map(
  all(nn, colon, nn),
  ([hour, , minutes]) => [hour, minutes] as const,
);
const hhmmss = map(
  all(hhmm, colon, nn),
  ([[hour, minutes], , seconds]) => [hour, minutes, seconds] as const,
);
const space = text(" ");
const space4 = map(text("    "), () => undefined);
const space5 = map(text("     "), () => undefined);
const space8 = map(text("        "), () => undefined);
const task = map(
  all(
    backquote,
    date,
    space,
    or(hhmm, space5),
    space,
    or(nnnn, space4),
    space,
    or(hhmmss, space8),
    space,
    or(hhmmss, space8),
    backquote,
    match(/[^\n]*$/),
  ),
  ([, base, , begin, , duration, , start, , end, , title]): Task => {
    const record: Interval = {};
    if (start) {
      record.start = set(base, {
        hours: start[0],
        minutes: start[1],
        seconds: start[2],
      });
    }
    if (record.start && end) {
      record.end = set(base, {
        hours: end[0],
        minutes: end[1],
        seconds: end[2],
      });
      if (isAfter(record.start, record.end)) {
        record.end.setDate(record.end.getDate() + 1);
      }
    }
    const plan: { start?: Date; duration?: number } = {};
    if (begin) plan.start = set(base, { hours: begin[0], minutes: begin[1] });
    if (duration) plan.duration = duration * 60;

    return { title, base, plan, record };
  },
);

const parseTask = (text: string): Task | undefined => {
  const result = parse(task, text);
  return result.ok ? result.value : undefined;
};

export { parseTask as parse };
export const isTask = (text: string): boolean => parseTask(text) !== undefined;

/** 比較用の開始日時を取得する */
export const startDate = (task: Task): Date =>
  task.record?.start ?? task.plan?.start ?? task.base;

/** 比較用の終了を取得する */
export const endDate = (task: Task): Date =>
  task.record?.end ??
    (!isNone(task.plan?.duration)
      ? addSeconds(startDate(task), task.plan.duration)
      : task.base);

/** 実行中か判定する */
export const isRunning = (task: Task): boolean =>
  task.record.start !== undefined && task.record.end === undefined;

/** 完了したか判定する */
export const isDone = (task: Task): boolean =>
  task.record.start !== undefined && task.record.end !== undefined;

/** Taskを文字列に直す */
export const toString = ({ title, base, plan, record }: Task): string =>
  [
    "`",
    lightFormat(base, "yyyy-MM-dd"),
    " ",
    plan?.start ? lightFormat(plan.start, "HH:mm") : " ".repeat(5),
    " ",
    plan?.duration
      ? `${plan.duration / 60}`
        .padStart(4, "0")
      : " ".repeat(4),
    " ",
    record?.start ? lightFormat(record?.start, "HH:mm:ss") : " ".repeat(8),
    " ",
    record?.end ? lightFormat(record?.end, "HH:mm:ss") : " ".repeat(8),
    "`",
    title,
  ].join("");

/** Taskに、インデントでぶら下がっている行のテキストデータを加えたもの*/
export interface TaskBlock extends Task {
  /**ぶら下がっているテキストデータ */ lines: string[];
}
/** 本文データから、タスクとそこにぶら下がった行をまとめて返す */
export function* parseBlock(
  lines: { text: string }[] | string[],
): Generator<TaskBlock, void, void> {
  for (const data of parseLines(lines)) {
    if (isString(data)) continue;
    yield data;
  }
}
/** 本文データを解析して結果を返す */
export function* parseLines(
  lines: { text: string }[] | string[],
): Generator<TaskBlock | string, void, void> {
  for (let i = 0; i < lines.length; i++) {
    const line_ = lines[i];
    const line = isString(line_) ? line_ : line_.text;
    const count = getIndentLineCount(i, lines);
    const task = parseTask(line);
    if (!task) {
      yield line;
      continue;
    }
    yield {
      ...task,
      lines: lines.slice(i + 1, i + 1 + count).map((line_) =>
        isString(line_) ? line_ : line_.text
      ),
    };
    i += count;
  }
}

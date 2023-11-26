import { addSeconds, isAfter, lightFormat } from "./deps/date-fns.ts";
import { isNone, isString } from "./utils.ts";
import { getIndentLineCount } from "./deps/scrapbox-std.ts";

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

const parseTask = (text: string): Task | undefined => {
  const matched = text.match(
    /^`(\d{4})-(\d{2})-(\d{2}) (?: {5}|(\d{2}):(\d{2})) (?: {4}|(\d{4})) (?: {8}|(\d{2}):(\d{2}):(\d{2})) (?: {8}|(\d{2}):(\d{2}):(\d{2}))`([^\n]*)$/,
  );
  if (!matched) return;

  // タスクが書き込まれた行を解析する
  const [
    ,
    year,
    month,
    date,
    phours,
    pminutes,
    duration,
    shours,
    sminutes,
    sseconds,
    ehours,
    eminutes,
    eseconds,
    title,
  ] = matched;
  const task: Task = {
    title,
    base: new Date(parseInt(year), parseInt(month) - 1, parseInt(date)),
    plan: {},
    record: {},
  };

  if (phours) {
    const start = new Date(task.base);
    start.setHours(parseInt(phours));
    start.setMinutes(parseInt(pminutes));
    task.plan.start = start;
  }
  if (duration) task.plan.duration = parseInt(duration) * 60;
  // 実績時刻を解析する
  // 開始時刻より終了時刻の方が前だったら、日付を越えているとみなす
  if (shours) {
    const start = new Date(task.base);
    start.setHours(parseInt(shours));
    start.setMinutes(parseInt(sminutes));
    start.setSeconds(parseInt(sseconds));
    task.record.start = start;
  }
  if (ehours) {
    const end = new Date(task.base);
    end.setHours(parseInt(ehours));
    end.setMinutes(parseInt(eminutes));
    end.setSeconds(parseInt(eseconds));
    if (task.record.start && isAfter(task.record.start, end)) {
      end.setDate(end.getDate() + 1);
    }
    task.record.end = end;
  }

  return task;
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

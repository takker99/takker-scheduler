import {
  addDays,
  addSeconds,
  isAfter,
  lightFormat,
  parse,
} from "./deps/date-fns.ts";
import { isNone, isString } from "./utils.ts";
import { getIndentLineCount } from "./lib/text.ts";

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

/** タスクの書式 */
const taskReg =
  /^`(\d{4}-\d{2}-\d{2}) ( {5}|\d{2}:\d{2}) ( {4}|\d{4}) ( {8}|\d{2}:\d{2}:\d{2}) ( {8}|\d{2}:\d{2}:\d{2})`([^\n]*)$/;

function parseTask(text: string): Task | undefined {
  if (!isTask(text)) return undefined;

  // タスクが書き込まれた行を解析する
  const [, base, plan, duration, start, end, title] = text.match(taskReg) ?? [];
  const task: Task = {
    title,
    base: parse(base, "yyyy-MM-dd", new Date(), undefined),
    plan: {},
    record: {},
  };

  if (plan.trim() !== "") {
    task.plan.start = parse(plan, "HH:mm", task.base);
  }
  if (duration.trim() !== "") {
    task.plan.duration = parseInt(duration) * 60;
  }
  // 実績時刻を解析する
  // 開始時刻より終了時刻の方が前だったら、日付を越えているとみなす
  if (start.trim() !== "") {
    task.record.start = parse(start, "HH:mm:ss", task.base);
  }
  if (end.trim() !== "") {
    let rEnd = parse(end, "HH:mm:ss", task.base);
    if (task.record?.start && rEnd && isAfter(task.record.start, rEnd)) {
      rEnd = addDays(rEnd, 1);
    }
    task.record.end = rEnd;
  }

  return task;
}
export { parseTask as parse };
export function isTask(text: string) {
  return taskReg.test(text);
}
/** 比較用の開始日時を取得する */
export function startDate(task: Task) {
  return task.record?.start ?? task.plan?.start ?? task.base;
}
/** 比較用の終了を取得する */
export function endDate(task: Task) {
  return task.record?.end ??
    (!isNone(task.plan?.duration)
      ? addSeconds(startDate(task), task.plan.duration)
      : task.base);
}

/** Taskを文字列に直す */
export function toString({ title, base, plan, record }: Task) {
  return [
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
}

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

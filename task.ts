import {
  addDays,
  addMinutes,
  getUnixTime,
  isAfter,
  lightFormat,
  parse,
} from "./deps/date-fns.ts";

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
    task.plan.start = parse(plan, "HH:mm", task.base, undefined);
  }
  if (duration.trim() !== "") {
    task.plan.duration = parseInt(duration) * 60;
  }
  // 実績時刻を解析する
  // 開始時刻より終了時刻の方が前だったら、日付を越えているとみなす
  if (start.trim() !== "") {
    task.record.start = parse(start, "HH:mm:ss", task.base, undefined);
  }
  if (end.trim() !== "") {
    let rEnd = parse(end, "HH:mm:ss", task.base, undefined);
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

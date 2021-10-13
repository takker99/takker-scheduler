/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />

import { goHead, goLine } from "./lib/motion.ts";
import { insertLine, insertText } from "./lib/edit.ts";
import { press } from "./lib/press.ts";
import { addDays, format, isAfter, parse } from "./deps/date-fns.ts";
import { getText } from "./lib/node.ts";
import { isNone } from "./deps/unknownutil.ts";

/** タスクの書式 */
const taskReg =
  /^`(\d{4}-\d{2}-\d{2}) ( {5}|\d{2}:\d{2}) ( {4}|\d{4}) ( {8}|\d{2}:\d{2}:\d{2}) ( {8}|\d{2}:\d{2}:\d{2})`([^\n]*)$/;

function parseDate(lineNo: number) {
  const text = getText(lineNo);
  if (isNone(text)) return undefined;
  const task = parseFromString(text);

  // lineNo行がタスク行でなければ何もしない
  return task ? { lineNo, ...task } : undefined;
}

export { parseDate as parse };
export function parseFromString(line: string) {
  if (!isTask(line)) return undefined;

  // タスクが書き込まれた行を解析する
  const [baseDateString, plan, estimate, start, end, title] = [
    ...line.match(
      taskReg,
    )?.slice(1) ?? [],
  ];
  const baseDate = parse(baseDateString, "yyyy-MM-dd", new Date(), undefined);

  // 実績時刻を解析する
  // 開始時刻より終了時刻の方が前だったら、日付を越えているとみなす
  const rStart = !/^\s*$/.test(start)
    ? parse(start, "HH:mm:ss", baseDate, undefined)
    : undefined;
  let rEnd = !/^\s*$/.test(end)
    ? parse(end, "HH:mm:ss", baseDate, undefined)
    : undefined;
  if (rStart && rEnd && isAfter(rStart, rEnd)) rEnd = addDays(rEnd, 1);

  return {
    title,
    baseDate,
    plan: {
      start: !/^\s*$/.test(plan)
        ? parse(plan, "HH:mm", baseDate, undefined)
        : undefined,
      duration: !/^\s*$/.test(estimate) ? { minutes: parseInt(estimate) }
      : undefined,
    },
    record: { start: rStart, end: rEnd },
  };
}
type Task = Extract<
  ReturnType<typeof parseFromString>,
  Record<string, unknown>
>;
export function isTask(text: string) {
  return taskReg.test(text);
}
async function setProperties(
  taskLine: Task,
  newTask: Partial<Task> & { lineNo?: number },
  { overwrite = true } = {},
) {
  const { title, baseDate, plan, record, lineNo } = newTask ?? {};

  const newTaskLine = {
    title: title ?? taskLine.title,
    baseDate: baseDate ?? taskLine.baseDate,
    plan: {
      start: isDeleted(plan?.start)
        ? undefined
        : plan?.start ?? taskLine?.plan?.start,
      duration: isDeleted(plan?.duration) ? undefined
      : plan?.duration ?? taskLine?.plan?.duration,
    },
    record: {
      start: isDeleted(record?.start) ? undefined
      : record?.start ?? taskLine?.record?.start,
      end: isDeleted(record?.end) ? undefined
      : record?.end ?? taskLine?.record?.end,
    },
    lineNo: lineNo ?? taskLine.lineNo,
  };

  if (overwrite) {
    await goLine(newTaskLine.lineNo);
    goHead();
    press("End", { shiftKey: true });
    await insertText(toString(newTaskLine));
  } else {
    await insertLine(newTaskLine.lineNo, toString(newTaskLine));
  }
}

function isDeleted(value: string): value is "delete" {
  return value === "delete";
}

export { setProperties as set };

export function toString({ title, baseDate, plan, record }) {
  return [
    "`",
    format(baseDate, "yyyy-MM-dd"),
    " ",
    plan?.start ? format(plan.start, "HH:mm") : " ".repeat(5),
    " ",
    plan?.duration
      ? String(plan.duration.minutes).padStart(4, "0")
      : " ".repeat(4),
    " ",
    record?.start ? format(record?.start, "HH:mm:ss") : " ".repeat(8),
    " ",
    record?.end ? format(record?.end, "HH:mm:ss") : " ".repeat(8),
    "`",
    title,
  ].join("");
}

import { isSameDay } from "../deps/date-fns.ts";
import { getLineRange } from "./getLineRange.ts";
import { modifyTasks } from "./modifyTasks.ts";

/** カーソル行もしくは選択範囲内の全てのタスクの日付を今日にする */
export async function moveToday() {
  const [start, end] = getLineRange();
  const now = new Date();
  await modifyTasks(start, end, (task) => {
    // 日付に変更がなければ何もしない
    if (isSameDay(task.base, now)) return task;
    task.base = now;
    return task;
  });
}

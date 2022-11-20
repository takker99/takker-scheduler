import { addDays } from "../deps/date-fns.ts";
import { getLineRange } from "./getLineRange.ts";
import { modifyTasks } from "./modifyTasks.ts";

/** カーソル行もしくは選択範囲内の全てのタスクの日付を進める
 *
 * @param [count=1] 進める日数
 */
export const walkDay = async (count = 1): Promise<void> => {
  const [start, end] = getLineRange();
  await modifyTasks(start, end, (task) => {
    task.base = addDays(task.base, count);
    return task;
  });
};

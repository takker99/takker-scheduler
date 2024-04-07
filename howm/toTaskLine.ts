import {
  getDuration,
  getLinkTitle,
  isAllDay,
  isRecurrence,
  isReminder,
  makeRepeat,
  Task,
} from "./parse.ts";
import { Task as TaskLine } from "../task.ts";
import { toDate } from "./localDate.ts";

/** タスクリンクのタスクデータを、日刊記録sheetに書き込むタスクライン用データに変換する
 *
 * @param task タスクリンクのタスクデータ
 * @param date 繰り返しタスクを生成したい日付。繰り返しタスクでなければ無視される
 * @return タスクライン用データ
 */
export const toTaskLine = (task: Task, date: Date): TaskLine | undefined => {
  if (!task.generated && isRecurrence(task)) {
    const generated = makeRepeat(task, date);
    if (!generated) return;
    return toTaskLine(generated, date);
  }
  const start = toDate(
    !isReminder(task) ? task.executed.start : task.freshness.refDate,
  );
  const durationMin = getDuration(task);

  const title = getLinkTitle(task);

  return {
    title: title !== undefined ? `[${title}]` : task.name,
    base: start,
    plan: {
      start: isAllDay(task) ? undefined : start,
      duration: durationMin !== undefined ? durationMin * 60 : undefined,
    },
    record: {},
  };
};

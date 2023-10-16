import { getDuration, isAllDay, Task, toString } from "../howm/parse.ts";
import { Task as TaskLine } from "../task.ts";
import { toDate } from "../howm/localDate.ts";

export const toTaskLine = (task: Task): TaskLine => {
  const start = toDate(
    "executed" in task ? task.executed.start : task.freshness.refDate,
  );
  const durationMin = getDuration(task);

  return {
    title: task.freshness ? `[${toString(task)}]` : task.name,
    base: start,
    plan: {
      start: isAllDay(task) ? undefined : start,
      duration: durationMin !== undefined ? durationMin * 60 : undefined,
    },
    record: {},
  };
};

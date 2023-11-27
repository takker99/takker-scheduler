import { getDuration, isAllDay, isReminder, Task, toString } from "./parse.ts";
import { Task as TaskLine } from "../task.ts";
import { toDate } from "./localDate.ts";

export const toTaskLine = (task: Task): TaskLine => {
  const start = toDate(
    !isReminder(task) ? task.executed.start : task.freshness.refDate,
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

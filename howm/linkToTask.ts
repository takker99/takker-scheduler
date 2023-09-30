import { getDuration, isAllDay, Task as TaskLink } from "./parse.ts";
import { Task } from "../task.ts";
import { toDate } from "./localDate.ts";

export const linkToTask = (taskLink: TaskLink): Task => {
  const start = toDate(taskLink.start);
  const dur = getDuration(taskLink);

  return {
    // 末尾に*があるタスクはリンクにしない
    title: taskLink.name.endsWith("*") ? taskLink.name : `[${taskLink.raw}]`,
    base: start,
    plan: {
      start: isAllDay(taskLink) ? undefined : start,
      duration: dur !== undefined ? dur * 60 : undefined,
    },
    record: {},
  };
};
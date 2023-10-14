import { Task, getDuration, isAllDay, toString } from "../howm/parse.ts";
import { Event } from "../event/parse.ts";
import { Task as TaskLine } from "../task.ts";
import { toDate } from "../howm/localDate.ts";

export const toTaskLine = (event: Event | Task): TaskLine => {
  const start = toDate(event.start);
  const duration = getDuration(event);

  return {
    // Taskの場合のみリンクにする
    title: "status" in event ? `[${toString(event)}]` : event.name,
    base: start,
    plan: {
      start: isAllDay(event) ? undefined : start,
      duration,
    },
    record: {},
  };
};

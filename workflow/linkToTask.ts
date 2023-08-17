import type { Task as TaskLink } from "./parse.ts";
import type { Task } from "../task.ts";

export const linkToTask = (taskLink: TaskLink): Task | undefined => {
  const { raw, startAt, duration } = taskLink;
  if (!startAt) return;
  if (startAt.type !== "date") return;
  const date = new Date(
    startAt.year,
    startAt.month,
    startAt.date,
  );

  return {
    title: `[${raw}]`,
    base: date,
    plan: {
      start: startAt.hours !== undefined
        ? new Date(
          startAt.year,
          startAt.month,
          startAt.date,
          startAt.hours,
          startAt.minutes ?? 0,
        )
        : undefined,
      duration: duration !== undefined
        ? duration * 60 // minからsに変換する
        : undefined,
    },
    record: {},
  };
};

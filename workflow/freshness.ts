import { toDate } from "./localDate.ts";
import { getEnd, Task } from "./parse.ts";

/** 1日をミリ秒単位で表したもの */
const oneday = 60 * 60 * 24 * 1000;

/** タスクの旬度を計算する
 *
 *  自分(@takker)用にtuningしてある。他の計算アルゴリズムにしたいときは、各自で別途作ること
 *
 *  @param task task
 *  @param now 現在日時
 *  @return taskの旬度
 */
export const calcFreshness = (task: Task, now: Date): number => {
  const start = toDate(task.start);
  const end = toDate(getEnd(task));
  const priority = (now.getTime() - start.getTime()) / oneday;
  start.setHours(0);
  start.setMinutes(0);

  switch (task.status) {
    case "schedule": {
      // 当日に0、それ以外は最低
      return start.getTime() <= now.getTime() && now.getTime() < end.getTime()
        ? 0
        : -Infinity;
    }
    case "done":
      // 常に最低
      return -Infinity;
    case "deadline":
      // 当日0になるよう上昇
      return now.getTime() + oneday * (task.speed ?? 7) < start.getTime()
        ? -Infinity
        : priority;
    case "todo":
      // 当日から上昇
      return now.getTime() < start.getTime()
        ? -Infinity
        : Math.min(priority - (task.speed ?? 7), 0);
    case "note":
      // 当日から下降
      return now.getTime() < start.getTime()
        ? -Infinity
        : -priority / (task.speed ?? 1);
    case "up-down": {
      const period = task.speed ?? 30;
      // 当日から下降と上昇を繰り返す
      return now.getTime() < start.getTime()
        ? -Infinity
        : period * (-1 + Math.cos(Math.PI * 2 * priority / period));
    }
  }
};

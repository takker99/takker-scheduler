import { parseLines } from "../task.ts";
import { isString } from "../utils.ts";
import { Event, fromTaskLine } from "./event.ts";

/** 日刊記録sheetから、Eventsを生成する
 *
 * 予定開始日時があるもののみ対象とする。完了未完了は考慮しない
 */
export const getEventsFromLines = (
  lines: string[],
  project: string,
): Event[] => {
  const events: Event[] = [];
  for (const task of parseLines(lines)) {
    if (isString(task)) continue;

    const event = fromTaskLine(task, project);
    if (!event) continue;

    events.push(event);
  }
  return events;
};

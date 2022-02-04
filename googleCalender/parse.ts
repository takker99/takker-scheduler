import type { Event } from "./events.ts";
import { parse as parseTask } from "../task.ts";
import { addSeconds } from "../deps/date-fns.ts";
import { encodeTitle } from "../lib/utils.ts";

interface ParseInit {
  /** 取得先project */ project: string;
  /** 取得先page title */ title: string;
  /** 行ID */ id: string;
}
/** 指定したテキストから予定と記録のcalendar登録用event objectsを作る
 *
 * @param text - task line (改行不可)
 * @param init - 追加のproperties
 */
export function parse(
  text: string,
  init: ParseInit,
): [Event | undefined, Event | undefined] | undefined {
  const task = parseTask(text);
  if (!task) return;

  const { title, plan, record } = task;
  const source = {
    title: init.title,
    url: `https://scrapbox.io/${init.project}/${
      encodeTitle(init.title)
    }#${init.id}`,
  };

  // eventの名前から[]を外して末尾の日付を消しておく
  const summary = title
    .replace(/\[([^\]]+)\]/g, "$1")
    .trim()
    .replace(/\s\d{4}-\d{2}-\d{2}$/, "")
    // 前に日付があるタイプも消す
    .replace(/^\d{4}-\d{2}-\d{2}\s/, "");

  return [
    plan.start && plan.duration && summary !== ""
      ? {
        summary,
        start: plan.start,
        end: addSeconds(plan.start, plan.duration),
        source,
        id: init.id,
      }
      : // 名無しの予定は飛ばす
        undefined,
    record.start && record.end
      ? {
        summary,
        start: record.start,
        end: record.end,
        source,
        id: init.id,
      }
      : undefined,
  ];
}

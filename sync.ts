import { EventOptions as Event, replaceEvents } from "./api/calendar.ts";
import { parse } from "./task.ts";
import { addSeconds } from "./deps/date-fns.ts";
import { encodeTitle } from "./lib/utils.ts";
import { oneByOne } from "./utils.ts";
import type { Line } from "./deps/scrapbox.ts";

/** 指定したページ中の全てのタスクをcalendarに登録する
 *
 * @param pages ページのタイトルとproject nameのリスト
 * @param calendarIds 登録先calendar IDのセット
 */
export async function syncPages(
  pages: { project: string; title: string }[],
  calendarIds: SyncInit,
) {
  const pendings = pages.map(async ({ project, title }) => {
    const res = await fetch(`/api/pages/${project}/${encodeTitle(title)}`);
    if (!res.ok) return;
    const { lines } = await res.json();
    return { lines, project, title, calendarIds };
  });

  for await (const result of oneByOne(pendings)) {
    if (result.state === "rejected") continue;
    if (!result.value) continue;
    const { lines, project, title, calendarIds } = result.value;
    await syncTasks(project, title, lines, calendarIds);
  }
}

export interface SyncInit {
  /** 予定を書き込むcalendarのID */ planId: string;
  /** 記録を書き込むcalendarのID */ recordId: string;
}
/** 特定のタスクページの全てのタスクをcalendarに登録する
 *
 * @param project タスクページがあるproject name
 * @param title: タスクページのタイトル
 * @param lines: タスクページの本文
 */
async function syncTasks(
  project: string,
  title: string,
  lines: Pick<Line, "text" | "id">[],
  { planId, recordId }: SyncInit,
) {
  const plans = [] as Event[];
  const records = [] as Event[];
  for (const { text, id } of lines) {
    const pair = analyze(text, { project, title, id });
    if (!pair) continue;
    if (pair[0]) plans.push(pair[0]);
    if (pair[1]) records.push(pair[1]);
  }

  // 書き込む
  console.log("Writing events...");
  await replaceEvents(planId, plans, { project, title });
  await replaceEvents(recordId, records, { project, title });
  console.log("Wrote.");
}

interface AnalyzeInit {
  /** 取得先project */ project: string;
  /** 取得先page title */ title: string;
  /** 行ID */ id: string;
}
/** 指定したテキストから予定と記録のcalendar登録用event objectsを作る
 *
 * @param text - task line (改行不可)
 * @param init - 追加のproperties
 */
function analyze(
  text: string,
  init: AnalyzeInit,
): [Event | undefined, Event | undefined] | undefined {
  const task = parse(text);
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

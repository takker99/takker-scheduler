/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference types="https://raw.githubusercontent.com/takker99/deno-gas-types/main/mod.d.ts" />

import { checkModifiedDiaryPages, getPages } from "./fetch.ts";
import { parse } from "./parse.ts";
import type { Event } from "./events.ts";
import { replace } from "./replace.ts";
import { toTitle } from "../diary.ts";
import { eachDayOfInterval, isAfter } from "../deps/date-fns.ts";

declare const global: Record<string, CallableFunction>;

/** 定期実行させる更新関数 */
function scheduledTask() {
  const props = PropertiesService.getScriptProperties();
  const checked = parseInt(props.getProperty("LAST_CHECKED") ?? "0");
  const now = Math.round(new Date().getTime() / 1000);
  const { project, sid } = get();
  console.log(`Start checking task pages' update at /${project}...`);
  console.log(`Last checked: ${new Date(checked * 1000)}`);
  const pages = checkModifiedDiaryPages(project, checked, { sid });
  console.log(`Checked. ${pages.length} pages were updated.`);
  console.log(pages.map(({ title }) => title));

  console.log(`Synchronize ${pages.length} task pages and the calendars...`);
  sync(pages);
  console.log("Synchronized.");

  props.setProperty("LAST_CHECKED", `${now}`);
  console.log("Successfully updaetd.");
}

/** 指定された期間の日付ページをGoogle Calendarに転記する */
function syncInterval(start: Date, end: Date) {
  const { project } = get();
  sync(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ).map((date) => ({ project, title: toTitle(date) })),
  );
}

/** 指定されたページのタスクと記録を全てGoogle Calendarに転記する */
function sync(
  pages: { project: string; title: string }[],
) {
  const { sid, planId, recordId } = get();
  console.log(`[sync] Downloading ${pages.length} pages' data...`);
  const data = getPages(pages, { sid });
  console.log(`[sync] Downloaded.`);

  for (const { lines, ...init } of data) {
    const plans = [] as Event[];
    const records = [] as Event[];
    for (const { text, id } of lines) {
      const [plan, record] = parse(text, { id, ...init }) ?? [];
      if (plan) plans.push(plan);
      if (record) records.push(record);
    }
    console.log(
      `[sync] /${init.project}/${init.title} has ${plans.length} events of plan and ${records.length} events of record.`,
    );
    console.log(
      `[sync] Writing ${plans.length} events to the plan calendar...`,
    );
    replace(planId, plans, init);
    console.log(
      `[sync] Writing ${records.length} events to the record calendar...`,
    );
    replace(recordId, records, init);
    console.log(
      `[sync] Finish Synchronization of /${init.project}/${init.title}.`,
    );
  }
}

/** 環境変数を取得する */
function get() {
  const props = PropertiesService.getScriptProperties();
  return {
    sid: props.getProperty("CONNECT_SID") ?? "",
    project: props.getProperty("PROJECT") ?? "",
    planId: props.getProperty("PLAN_ID") ?? "",
    recordId: props.getProperty("RECORD_ID") ?? "",
  };
}

/** 環境変数を設定する */
function set(
  init: { sid: string; project: string; planId: string; recordId: string },
) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("CONNECT_SID", init.sid);
  props.setProperty("PROJECT", init.project);
  props.setProperty("PLAN_ID", init.planId);
  props.setProperty("RECORD_ID", init.recordId);
}

global.get = get;
global.set = set;
global.syncInterval = syncInterval;
global.scheduledTask = scheduledTask;

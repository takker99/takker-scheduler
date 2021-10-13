import { replaceEvents } from "./api/calendar.js";
import { parseFromString } from "./task.js";
import { add } from "./deps/date-fns.ts";

//declare const calendarIds:string[];

export async function syncMultiPages(pages) {
  const params = await Promise.all(pages.map(async ({ project, title }) => {
    const titleLc = title.toLowerCase().replace(/ /g, "_");
    const res = await fetch(
      `/api/pages/${project}/${encodeURIComponent(titleLc)}`,
    );
    if (!res.ok) return;
    const { lines } = await res.json();
    return { lines, options: { project, title, ...calendarIds } };
  }));
  for (const { lines, options } of params) {
    await syncTasks(lines, options);
  }
}

async function syncTasks(lines, { project, title, planId, recordId }) {
  const { plans, records } = analyze(lines, { project, title });

  // 書き込む
  console.log("Writing events...");
  await replaceEvents(planId, plans, { project, title });
  await replaceEvents(recordId, records, { project, title });
  console.log("Wrote.");
}

export function analyze(lines, { project, title }) {
  console.log("Analyzing...");
  const titleLc = title.toLowerCase().replace(/ /g, "_");

  // 行情報に含まれるtask lineを全て抽出する
  const tasks = lines.flatMap(({ text, id }) => {
    const task = parseFromString(text);
    const result = [];
    if (!task) return result;

    const { title: _summary, plan, record } = task;
    const source = {
      title: titleLc,
      url: `https://scrapbox.io/${project}/${titleLc}#${id}`,
    };
    const extendedProperties = { private: { project, title, id } };

    // eventの名前から[]を外して末尾の日付を消しておく
    const summary = _summary
      .replace(/\[([^\]]+)\]/g, "$1")
      .trim()
      .replace(/\s\d{4}-\d{2}-\d{2}$/, "")
      // 前に日付があるタイプも消す
      .replace(/^\d{4}-\d{2}-\d{2}\s/, "");
    // 予め予定と記録に分けておく
    // 名無しの予定は飛ばす
    if (plan.start && plan.duration && summary !== "") {
      result.push({
        type: "plan",
        summary,
        start: plan.start,
        end: add(plan.start, plan.duration),
        extendedProperties,
        source,
      });
    }
    if (record.start && record.end) {
      result.push({
        type: "record",
        summary,
        start: record.start,
        end: record.end,
        extendedProperties,
        source,
      });
    }
    return result;
  });

  // 予定と記録に分ける
  const plans = tasks.filter(({ type }) => type === "plan");
  const records = tasks.filter(({ type }) => type === "record");
  console.log("Analyzed: ", plans, records);

  return { plans, records };
}

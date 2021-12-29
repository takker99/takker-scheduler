/// <reference lib="dom" />
import { toString } from "./task.ts";
import { getTitle } from "./diary.ts";
import { lightFormat, parse } from "./deps/date-fns.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export function isTaskPortalPage(title: string) {
  return /^(?:🔳|📝)/u.test(title);
}
export type IsTaskPortalPage = (title: string) => boolean;

export async function generatePlan(
  dates: Date[],
  targetProject: string,
) {
  targetProject = targetProject ?? scrapbox.Project.name;
  const taskList =
    (await Promise.all(dates.map((date) => generateTaskList(date))))
      .flat();

  // 日付ごとにまとめる
  const taskStrings = {} as Record<string, string[]>;
  taskList.forEach((task) => {
    const key = lightFormat(task.baseDate, "yyyy-MM-dd");
    taskStrings[key] = [
      ...(taskStrings[key] ?? []),
      toString(task),
    ];
  });

  // 新しいタブで開く
  for (const [key, tasks] of Object.entries(taskStrings)) {
    const body = encodeURIComponent(tasks.join("\n"));
    const title = encodeURIComponent(
      getTitle(parse(key, "yyyy-MM-dd", new Date(), undefined)),
    );
    window.open(`https://scrapbox.io/${targetProject}/${title}?body=${body}`);
  }
}
async function generateTaskList(date: Date) {
  const generates = await getFunctions(isTaskPortalPage, "generate.js");
  return (await Promise.all(generates.map((generate) => generate(date))))
    .flat();
}
async function getFunctions(judge: IsTaskPortalPage, filename: string) {
  const titles = scrapbox.Project.pages
    .flatMap(({ titleLc, exists }) =>
      (exists && judge(titleLc)) ? [titleLc] : []
    );
  const generates = await Promise.all(
    titles.map((title) => getFunction(title, filename)),
  );
  return generates.filter((generate) => generate);
}
async function getFunction(title: string, filename: string) {
  try {
    const { generate } = await import(
      `/api/code/${scrapbox.Project.name}/${title}/${filename}`
    );
    return generate;
  } catch (e) {
    // 404 Not foundは無視
    if (!(e instanceof SyntaxError)) return;
    console.error(e);
    return;
  }
}

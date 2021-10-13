import { toString } from "./task.js";
import { getTitle } from "./diary.ts";
import { lightFormat, parse } from "./deps/date-fns.ts";
import { insertText } from "./lib/insertText.ts";
import { goLastLine } from "./lib/motion.ts";
import { press } from "./lib/press.ts";

export function isTaskPortalPage(title) {
  return /^(?:🔳|📝)/u.test(title);
}
export async function generatePlan(
  dates,
  targetProject,
  { minify = false } = {},
) {
  targetProject = targetProject ?? scrapbox.Project.name;
  const taskList =
    (await Promise.all(dates.map((date) => generateTaskList(date))))
      .flat();

  if (minify) {
    // 現在のページの末尾に書き込む
    await goLastLine();
    press("Enter");
    await insertText(taskList.map((task) => toString(task)).join("\n"));
    return;
  }

  // 日付ごとにまとめる
  const taskStrings = {};
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
      getTitle(parse(key, "yyyy-MM-dd", new Date())),
    );
    window.open(`https://scrapbox.io/${targetProject}/${title}?body=${body}`);
  }
}
async function generateTaskList(date) {
  const generates = await getFunctions(isTaskPortalPage, "generate.js");
  return (await Promise.all(generates.map((generate) => generate(date))))
    .flat();
}
async function getFunctions(judge, filename) {
  const titles = scrapbox.Project.pages
    .flatMap(({ titleLc, exists }) =>
      (exists && judge(titleLc)) ? [titleLc] : []
    );
  const generates = await Promise.all(
    titles.map((title) => getFunction(title, filename)),
  );
  return generates.filter((generate) => generate);
}
async function getFunction(title, filename) {
  try {
    const { generate } = await import(
      `/api/code/${scrapbox.Project.name}/${title}/${filename}`
    );
    return generate;
  } catch (e) {
    // 404 Not foundは無視
    if (!(e instanceof SyntaxError)) return undefined;
    console.error(e.message);
    console.error(
      `file: ${e.fileName}, line: ${e.lineNumber}, col: ${e.columnNumber}`,
    );
    console.error(e.stack);
    return undefined;
  }
}

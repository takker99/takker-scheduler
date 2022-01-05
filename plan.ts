/// <reference lib="dom" />
import { Task, toString } from "./task.ts";
import { format, toTitle } from "./diary.ts";
import { lightFormat } from "./deps/date-fns.ts";
import { encodeTitle } from "./lib/utils.ts";
import { oneByOne } from "./utils.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

export function isTaskPortalPage(title: string) {
  return /^(?:🔳|📝)/u.test(title);
}
export type IsTaskPortalPage = (title: string) => boolean;
/** 指定された日付に実行するタスクを出力する函数
 *
 * @param date 実行日
 */
export type TaskGenerator = (date: Date) => Task[];

export async function* makeDiaryPages(
  dates: Iterable<Date>,
) {
  const pendings = [] as Promise<{ date: Date; lines: string[] }>[];
  for (const date of dates) {
    pendings.push((async () => {
      const lines = [toTitle(date)];
      for await (
        const generate of getFunctions(isTaskPortalPage, "generate.js")
      ) {
        for (const task of generate(date)) {
          lines.push(toString(task));
        }
      }

      return {
        date,
        lines: [...format(lines), lightFormat(date, "#yyyy-MM-dd HH:mm:ss")],
      };
    })());
  }

  for await (const result of oneByOne(pendings)) {
    if (result.state === "rejected") continue;
    yield result.value;
  }
}
async function* getFunctions(judge: IsTaskPortalPage, filename: string) {
  const pendings = scrapbox.Project.pages
    .flatMap(({ title, exists }) =>
      (exists && judge(title)) ? [getFunction(title, filename)] : []
    );
  for await (
    const result of oneByOne(pendings)
  ) {
    if (result.state === "rejected") continue;
    if (!result.value) continue;
    yield result.value;
  }
}
async function getFunction(title: string, filename: string) {
  try {
    const { generate } = await import(
      `/api/code/${scrapbox.Project.name}/${encodeTitle(title)}/${filename}`
    );
    return generate as TaskGenerator;
  } catch (e) {
    // 404 Not foundは無視
    if (!(e instanceof SyntaxError)) return;
    console.error(e);
    return;
  }
}

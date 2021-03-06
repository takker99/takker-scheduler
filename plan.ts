/// <reference lib="dom" />
import { Task, toString } from "./task.ts";
import { format, toTitle } from "./diary.ts";
import { oneByOne } from "./utils.ts";
import { lightFormat } from "./deps/date-fns.ts";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import type { Scrapbox } from "./deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

export function isTaskPortalPage(title: string) {
  return /^(?:๐ณ|๐)/u.test(title);
}
export type IsTaskPortalPage = (title: string) => boolean;
/** ๆๅฎใใใๆฅไปใซๅฎ่กใใใฟในใฏใๅบๅใใๅฝๆฐ
 *
 * @param date ๅฎ่กๆฅ
 */
export type TaskGenerator = (date: Date) => Task[] | Promise<Task[]>;

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
        const pending = generate(date);
        for (
          const task of pending instanceof Promise ? await pending : pending
        ) {
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
      `/api/code/${scrapbox.Project.name}/${encodeTitleURI(title)}/${filename}`
    );
    return generate as TaskGenerator;
  } catch (e) {
    // ๆงๆใจใฉใผใจ่ชญใฟ่พผใฟใจใฉใผใฏ็ก่ฆ
    if (e instanceof SyntaxError) return;
    if (e instanceof TypeError) return;
    throw e;
  }
}

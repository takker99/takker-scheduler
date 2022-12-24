/// <reference lib="dom" />
import { Task } from "./task.ts";
import { oneByOne } from "./utils.ts";
import { encodeTitleURI } from "./deps/scrapbox-std.ts";
import type { Scrapbox } from "./deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

export const isTaskPortalPage = (title: string): boolean =>
  /^(?:🔳|📝)/u.test(title);

export type IsTaskPortalPage = (title: string) => boolean;

/** 指定された日付に実行するタスクを出力する函数
 *
 * @param date 実行日
 */
export type TaskGenerator = (date: Date) => Task[] | Promise<Task[]>;

/** 指定された日付に実行するタスクを取得する */
export async function* readProgrammableTasks(
  date: Date,
): AsyncGenerator<Task[], void, unknown> {
  for await (
    const generate of getFunctions(isTaskPortalPage, "generate.js")
  ) {
    const pending = generate(date);
    yield pending instanceof Promise ? await pending : pending;
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
const getFunction = async (title: string, filename: string) => {
  try {
    const { generate } = await import(
      `/api/code/${scrapbox.Project.name}/${encodeTitleURI(title)}/${filename}`
    );
    return generate as TaskGenerator;
  } catch (e) {
    // 構文エラーと読み込みエラーは無視
    if (e instanceof SyntaxError) return;
    if (e instanceof TypeError) return;
    throw e;
  }
};

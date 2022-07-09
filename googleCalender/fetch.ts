/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference types="https://raw.githubusercontent.com/takker99/deno-gas-types/main/mod.d.ts" />

import { isDiaryPage } from "../diary.ts";
import { encodeTitleURI } from "../deps/scrapbox-std.ts";
import type { Line, PageList } from "../deps/scrapbox-std.ts";

export interface GetPagesInit {
  sid: string;
}
export interface PageResult {
  project: string;
  title: string;
  lines: Line[];
}
/** ページデータを一括して取得する
 *
 * @param pages 取得したいページのリスト
 * @param init 認証情報など
 */
export function getPages(
  pages: { project: string; title: string }[],
  init: GetPagesInit,
): PageResult[] {
  const responses = fetchAll(
    pages.map(({ project, title }) => ({
      url: `https://scrapbox.io/api/pages/${project}/${encodeTitleURI(title)}`,
      headers: { Cookie: `connect.sid=${init.sid}` },
      muteHttpExceptions: true,
    })),
  );

  // 必要なデータだけ取り出して返す
  return responses.flatMap((response, i) => {
    const ok = response.getResponseCode() === 200;
    if (!ok) return [];
    const lines = JSON.parse(response.getContentText()).lines as Line[];

    return [{
      project: pages[i].project,
      title: pages[i].title,
      lines,
    }];
  });
}

/** `from`以降に更新された日付ページを探す
 *
 * @param project 日付ページを探すproject name
 * @param from この日時(UNIX時刻)より後に更新された日付ページを探す
 * @param init 認証情報など
 */
export function checkModifiedDiaryPages(
  project: string,
  from: number,
  init: GetPagesInit,
): { project: string; title: string }[] {
  const list = getPageList(project, init);
  if (!list) return [];
  const count = list.count;
  const diaryPages = list.pages.flatMap(({ title, updated }) =>
    isDiaryPage(title) && updated > from ? [{ project, title }] : []
  );

  if (count <= 1000) return diaryPages;

  // 1001ページ以上あるprojectの場合は、次のページにも更新された日付ページがないか確認する
  // すこし冗長なalgorithmかも
  for (let i = 1; i < Math.floor(count / 1000) + 1; i++) {
    const list = getPageList(project, { skip: i * 1000, ...init });
    if (!list) break;
    const pages = list.pages.flatMap(({ title, updated }) =>
      isDiaryPage(title) && updated > from ? [{ project, title }] : []
    );
    if (pages.length === 0) break;
    diaryPages.push(...pages);
  }
  return diaryPages;
}

interface PageListInit {
  sid: string;
  limit?: number;
  skip?: number;
}
function getPageList(project: string, init: PageListInit) {
  const response = UrlFetchApp.fetch(
    `https://scrapbox.io/api/pages/${project}?limit=${
      init.limit ?? 1000
    }&skip=${init.skip ?? 0}`,
    {
      headers: { Cookie: `connect.sid=${init.sid}` },
    },
  );
  const ok = response.getResponseCode() === 200;
  if (!ok) return;
  const { pages, count } = JSON.parse(response.getContentText()) as PageList;
  return { pages, count };
}

const chunk = 10;
/** `chunk`件ずつfetchする関数 */
function fetchAll(
  requests: (string | GoogleAppsScript.URL_Fetch.URLFetchRequest)[],
) {
  const count = Math.floor(requests.length / chunk) + 1;
  return [...Array(count).keys()].flatMap((i) =>
    UrlFetchApp.fetchAll(
      requests.slice(i * chunk, (i + 1) * chunk),
    )
  );
}

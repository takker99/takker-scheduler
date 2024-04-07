import { useEffect, useLayoutEffect, useState } from "../deps/preact.tsx";
import { getPage, toTitleLc } from "../deps/scrapbox-std.ts";
import { Scrapbox, takeInternalLines } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

type Key = `/${string}/${string}`;
const toKey = (project: string, title: string): Key =>
  `/${project}/${toTitleLc(title)}`;
const pages = new Map<Key, string[]>();
type Listener = (lines: string[]) => void;
const listeners = new Map<Key, Set<Listener>>();
const emitChange = (key: Key, lines: string[]) => {
  pages.set(key, lines);
  for (const listener of listeners.get(key) ?? []) {
    listener(lines);
  }
};
// 入力するたびに更新する
// 更新は`get()`で1回以上呼び出されたpagesのみを対象とする
{
  let update: undefined | (() => void);
  let timer: undefined | number;
  scrapbox.on("page:changed", () => {
    if (update) scrapbox.off("lines:changed", update);

    const project = scrapbox.Project.name;
    const title = scrapbox.Page.title ?? "";
    const key = toKey(project, title);
    if (!pages.has(key)) return;

    update = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
      const lines = takeInternalLines().map((line) => line.text);

      // 更新のタイミングの影響で、本文がまだ更新されていない可能性がある
      // その場合は`title`と本文先頭の文字列が一致するまで待機する
      timer = setInterval(() => {
        if (toTitleLc(title) !== toTitleLc(lines[0])) return;
        emitChange(key, lines);
        if (timer !== undefined) {
          clearInterval(timer);
          timer = undefined;
        }
      }, 1000);
    };
    scrapbox.on("lines:changed", update);
  });
}

const get = (project: string, title: string): string[] => {
  const key = toKey(project, title);
  const result = pages.get(key);
  if (!result) {
    getPage(project, title)
      .then((result) => {
        if (!result.ok) return [];
        const lines = result.value.lines.map((line) => line.text);
        emitChange(key, lines);
      });
  }
  return result ?? [];
};

/** scrapboxのページテキストを格納・参照するhooks */
export const useLines = (project: string, title: string): string[] => {
  const [lines, setLines] = useState<string[]>(get(project, title));

  // ちらつき(FOUC)対策
  useLayoutEffect(() => setLines(get(project, title)), [project, title]);

  useEffect(() => {
    const key = toKey(project, title);
    const set = listeners.get(key) ?? new Set();
    set.add(setLines);
    listeners.set(key, set);
    return () => {
      set.delete(setLines);
    };
  }, [project, title]);

  return lines;
};

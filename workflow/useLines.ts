import { useEffect, useState } from "../deps/preact.tsx";
import { getPage } from "../deps/scrapbox-std.ts";
import { Scrapbox, takeInternalLines } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

type Key = `/${string}/${string}`;
const toKey = (project: string, title: string): Key => `/${project}/${title}`;
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
{
  let update: undefined | (() => void);
  scrapbox.on("page:changed", () => {
    if (update) scrapbox.off("lines:changed", update);

    const project = scrapbox.Project.name;
    const title = scrapbox.Page.title ?? "";
    const key = toKey(project, title);
    if (!pages.has(key)) return;

    update = () =>
      emitChange(key, takeInternalLines().map((line) => line.text));
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

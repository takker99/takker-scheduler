import { toString } from "../task.ts";
import { getLineRange } from "./getLineRange.ts";
import { parseSpecifier } from "../parseSpecifier.ts";
import { replaceLines } from "../lib/edit.ts";
import { getLines } from "../lib/node.ts";
import { toDate } from "../diary.ts";
import type { Scrapbox } from "../deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

/** 選択範囲中の行から、一行ごとに新しいタスクを作る */
export async function createTask() {
  const base = toDate(scrapbox.Page.title ?? "") ?? new Date();
  const [start, end] = getLineRange();

  const text = getLines().slice(start, end + 1)
    .flatMap((line) => {
      // 選択範囲から判断する項目と開始日時を取得する
      const text = line.text.trimEnd(); // インデントは維持する
      if (text === "") return [];
      const { name, start, duration } = parseSpecifier(text, base) ?? {};
      if (!name || (!start && !duration)) return [];

      // タスクの文字列を作る
      return [
        toString({
          title: name.trim(),
          base: start ?? base,
          plan: { start, duration },
          record: {},
        }),
      ];
    }).join("\n");

  // 書き込む
  await replaceLines(start, end, text);
}

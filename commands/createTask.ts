import { toString } from "../task.ts";
import { getLineRange } from "./getLineRange.ts";
import { parseSpecifier } from "../parseSpecifier.ts";
import { getLines, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

/** 選択範囲中の行から、一行ごとに新しいタスクを作る */
export const createTask = async (): Promise<void> => {
  const base = new Date();
  const [start, end] = getLineRange();

  const lines = getLines().slice(start, end + 1).map((line) => line.text);
  const newLines = lines
    .flatMap((line) => {
      // 選択範囲から判断する項目と開始日時を取得する
      const text = line.trimEnd(); // インデントは維持する
      if (text === "") return line;
      const { name, start, duration } = parseSpecifier(text, base) ?? {};
      if (!name || (!start && !duration)) return line;

      // タスクの文字列を作る
      return [
        toString({
          title: name.trim(),
          base: start ?? base,
          plan: { start, duration },
          record: {},
        }),
      ];
    });

  // 何も変化しなければ書き込まない
  if (lines.join("\n") === newLines.join("\n")) return;

  // 書き込む
  for (let i = start; i <= end; i++) {
    scrapbox.Page.updateLine(newLines[i - start], i);
  }
  await scrapbox.Page.waitForSave();
};

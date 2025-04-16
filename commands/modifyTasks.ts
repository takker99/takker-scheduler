import { parse, Task, toString } from "../task.ts";
import { getText, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

/** 指定範囲内の全てのタスクを一括操作する
 *
 * @param start 選択範囲の先頭の行
 * @param end 選択範囲の末尾の行
 * @param change 各タスクに適用する操作
 */
export const modifyTasks = async (
  start: number,
  end: number,
  change: (
    /** 変更するタスク */ task: Task,
    /** タスクを取得した行の行番号 */ index: number,
  ) => Task,
): Promise<void> => {
  const lines = [] as string[];
  for (let i = start; i <= end; i++) {
    const text = getText(i) ?? "";
    const task = parse(text);
    // タスクとみなされた行だけ変更する
    if (!task) {
      lines.push(text);
      continue;
    }
    lines.push(toString(change(task, i)));
  }

  // 書き込む
  for (let i = start; i <= end; i++) {
    scrapbox.Page.updateLine(lines[i - start], i);
  }
  await scrapbox.Page.waitForSave();
};

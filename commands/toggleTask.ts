import { caret, getText, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { parse, toString } from "../task.ts";
import { startTask } from "./startTask.ts";
import { endTask } from "./endTask.ts";
declare const scrapbox: Scrapbox;

/** カーソル行のタスクを状態をcyclicに変更するmethod
 *
 * 以下の順に状態が変化する
 * 1. 未開始
 * 2. 開始
 * 3. 終了
 * 4. 未開始
 * ...
 */
export const toggleTask = async (): Promise<void> => {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;

  // 開始していないときは開始する
  if (!start) {
    await startTask();
    return;
  }
  // 終了していないときは終了する
  if (!end) {
    await endTask();
    return;
  }

  // すでに終了しているタスクは未開始に戻す
  scrapbox.Page.updateLine(
    toString({
      record: {},
      ...rest,
    }),
    linePos,
  );
  await scrapbox.Page.waitForSave();
};

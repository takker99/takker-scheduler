import { caret, getText, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { parse, toString } from "../task.ts";
declare const scrapbox: Scrapbox;

/** カーソル行のタスクを開始する
 *
 * 既に開始されていたら、開始をキャンセルする
 */
export const startTask = async (): Promise<void> => {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (end) return; // すでに終了していたら何もしない

  // 開始時刻をtoggleする
  scrapbox.Page.updateLine(
    toString({
      record: { start: !start ? new Date() : undefined },
      ...rest,
    }),
    linePos,
  );
  await scrapbox.Page.waitForSave();
};

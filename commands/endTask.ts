import { parse, toString } from "../task.ts";
import { caret, getText, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

/** カーソル行のタスクを終了する
 *
 * 既に終了していたら、終了をキャンセルする
 * 開始されていないタスクには効果がない
 */
export const endTask = async (): Promise<void> => {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (!start) return; // まだ開始していなかったら何もしない

  // 終了時刻をtoggleする
  scrapbox.Page.updateLine(
    toString({
      record: { start, end: !end ? new Date() : undefined },
      ...rest,
    }),
    linePos,
  );
  await scrapbox.Page.waitForSave();
};

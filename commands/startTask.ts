import { caret, getText, replaceLines } from "../deps/scrapbox-std-dom.ts";
import { parse, toString } from "../task.ts";

/** カーソル行のタスクを開始する
 *
 * 既に開始されていたら、開始をキャンセルする
 */
export async function startTask() {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (end) return; // すでに終了していたら何もしない

  // 開始時刻をtoggleする
  await replaceLines(
    linePos,
    linePos,
    toString({
      record: { start: !start ? new Date() : undefined },
      ...rest,
    }),
  );
}

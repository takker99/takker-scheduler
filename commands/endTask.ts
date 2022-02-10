import { parse, toString } from "../task.ts";
import { caret, getText, replaceLines } from "../deps/scrapbox-std.ts";

/** カーソル行のタスクを終了する
 *
 * 既に終了していたら、終了をキャンセルする
 * 開始されていないタスクには効果がない
 */
export async function endTask() {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (!start) return; // まだ開始していなかったら何もしない

  // 終了時刻をtoggleする
  await replaceLines(
    linePos,
    linePos,
    toString({
      record: { start, end: (!end ? new Date() : undefined) },
      ...rest,
    }),
  );
}

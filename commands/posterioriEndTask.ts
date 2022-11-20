import { parse, toString } from "../task.ts";
import { endTask } from "./endTask.ts";
import {
  caret,
  getLines,
  getText,
  replaceLines,
} from "../deps/scrapbox-std-dom.ts";

/** カーソル行のタスクを事後報告的に終了する
 *
 * カーソル行より前にあるタスクの終了時刻を開始時刻として記入する
 * カーソル行より前に終了しているタスクが一つもないときは、現在時刻を開始時刻とする
 *
 * 既に開始しているタスクだった場合は、`endTask()`と同じ処理を行う
 */
export const posterioriEndTask = async (): Promise<void> => {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (start) {
    if (end) return;
    await endTask();
    return;
  }
  if (end) return;

  // 直近のタスクの終了日時を取得する
  let prevEnd: Date | undefined = undefined;
  for (const { text } of getLines().slice(0, (linePos ?? 0) + 1).reverse()) {
    const { record } = parse(text) ?? {};
    if (record?.end) {
      prevEnd = record.end;
      break;
    }
  }

  // 上書きする
  const now = new Date();
  await replaceLines(
    linePos,
    linePos,
    toString({
      record: { start: prevEnd ?? now, end: now },
      ...rest,
    }),
  );
};

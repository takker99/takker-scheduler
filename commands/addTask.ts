import { parse, toString } from "../task.ts";
import { addSeconds } from "../deps/date-fns.ts";
import { caret, getText, insertLine } from "../deps/scrapbox-std.ts";

const interval = 5 * 60; // 5 minutes
/** カーソル行の下にタスクを追加する
 *
 * カーソル行がタスクだった場合は、そのタスクの日付と予定開始時刻、見積もり時間を引き継ぐ
 */
export async function addTask() {
  const linePos = caret().position.line;
  const taskLine = parse(getText(linePos) ?? "");

  // 現在行がタスクなら、それと同じ日付にする
  // 違ったら今日にする
  const base = taskLine?.base ?? new Date();

  // 予定開始時刻と見積もり時間を計算する
  const plan = {
    start: taskLine?.plan?.start
      // 予定開始時刻は、その前のタスクの見積もり時間にintervalを足したものだけずらしておく
      ? addSeconds(
        taskLine.plan.start,
        interval + (taskLine.plan.duration ?? 0),
      )
      : undefined,
    duration: taskLine?.plan?.duration,
  };

  // カーソル行の下に書き込む
  await insertLine(
    linePos + 1,
    toString({ title: "", base, plan, record: {} }),
  );
}

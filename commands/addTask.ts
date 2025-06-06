import { parse, toString } from "../task.ts";
import { addSeconds } from "../deps/date-fns.ts";
import { caret, getText, type Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

const interval = 5 * 60; // 5 minutes
/** カーソル行の下にタスクを追加する
 *
 * カーソル行がタスクだった場合は、そのタスクの日付と予定開始時刻、見積もり時間を引き継ぐ
 */
export const addTask = async (): Promise<void> => {
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
  scrapbox.Page.insertLine(
    toString({ title: "", base, plan, record: {} }),
    linePos + 1,
  );
  await scrapbox.Page.waitForSave();
};

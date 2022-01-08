import { insertLine, replaceLines } from "./lib/edit.ts";
import { caret } from "./lib/caret.ts";
import { getLines, getText } from "./lib/node.ts";
import { parse, Task, toString } from "./task.ts";
import { format as formatPage, toDate, toTitle } from "./diary.ts";
import {
  addDays,
  addSeconds,
  eachDayOfInterval,
  isAfter,
  isSameDay,
} from "./deps/date-fns.ts";
import { makeDiaryPages } from "./plan.ts";
import { getDatesFromSelection } from "./utils.ts";
import { encodeTitle } from "./lib/utils.ts";
import { SyncInit, syncPages } from "./sync.ts";
import { joinPageRoom } from "./deps/scrapbox.ts";
import type { Scrapbox } from "./deps/scrapbox.ts";
declare const scrapbox: Scrapbox;

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

function getModifyRange() {
  const { selectionRange: { start, end } } = caret();
  return [start.line, end.line] as const;
}

/** カーソル行もしくは選択範囲内の全てのタスクの日付を進める
 *
 * @param [count=1] 進める日数
 */
export async function walkDay(count = 1) {
  const [start, end] = getModifyRange();
  await modifyTasks(start, end, (task) => {
    task.base = addDays(task.base, count);
    return task;
  });
}

/** カーソル行もしくは選択範囲内の全てのタスクの日付を今日にする */
export async function moveToday() {
  const [start, end] = getModifyRange();
  const now = new Date();
  await modifyTasks(start, end, (task) => {
    // 日付に変更がなければ何もしない
    if (isSameDay(task.base, now)) return task;
    task.base = now;
    return task;
  });
}

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
      record: { start, end: !end ? new Date() : undefined },
      ...rest,
    }),
  );
}

/** カーソル行のタスクを状態をcyclicに変更するmethod
 *
 * 以下の順に状態が変化する
 * 1. 未開始
 * 2. 開始
 * 3. 終了
 * 4. 未開始
 * ...
 */
export async function toggleTask() {
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
  await replaceLines(
    linePos,
    linePos,
    toString({
      record: {},
      ...rest,
    }),
  );
}

/** カーソル行のタスクを事後報告的に終了する
 *
 * カーソル行より前にあるタスクの終了時刻を開始時刻として記入する
 * カーソル行より前に終了しているタスクが一つもないときは、現在時刻を開始時刻とする
 *
 * 既に開始しているタスクだった場合は、`endTask()`と同じ処理を行う
 */
export async function posterioriEndTask() {
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
}

/** タスクページをformatする
 *
 * @param project formatしたいページのproject name
 * @param title formatしたいページのタイトル
 */
export async function format(project: string, title: string) {
  const { patch, cleanup } = await joinPageRoom(
    project,
    title,
  );
  await patch((lines) => formatPage(lines.map((line) => line.text)));
  cleanup();
}

/** 指定した日付の日付ページを作成する
 *
 * 複数作成可能。
 *
 * @param dates 作成したい日付のリスト
 * @param project 日付ページを作成するproject
 */
export async function* makePlan(dates: Iterable<Date>, project: string) {
  const thisDate = toDate(scrapbox.Page.title ?? "");
  let temp: string[] | undefined;

  for await (const { date, lines } of makeDiaryPages(dates)) {
    if (
      thisDate && isSameDay(thisDate, date) && project === scrapbox.Project.name
    ) {
      temp = lines;
      continue;
    }
    const { insert, cleanup } = await joinPageRoom(project, lines[0]);
    await insert(lines.slice(1).join("\n"), "_end");
    cleanup();
    yield { message: `Created "/${project}/${lines[0]}"`, lines };
  }

  if (!temp) return;
  const a = document.createElement("a");
  a.href = `./${encodeTitle(temp[0])}?body=${
    encodeURIComponent(temp.slice(1).join("\n"))
  }`;
  document.body.append(a);
  a.remove();
  yield { message: `Created "/${project}/${temp[0]}"`, lines: temp };
}

/** 選択範囲に含まれる日付の日付ページを全て作成する
 *
 * ２つ以上の日付が含まれていたら、最初と最後の日付の期間中の全ての日付を対象とする
 *
 * @param project 日付ページを作成するproject
 */
export async function* makePlanFromSelection(project: string) {
  const dates = [...getDatesFromSelection()];
  if (dates.length === 0) return;
  if (dates.length === 1) {
    yield* makePlan(
      dates,
      project,
    );
    return;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  yield* makePlan(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ),
    project,
  );
}

// TODO: implement blow
// - transport()
// - walkPlanStart()
// - walkPlanDuration()
// - setPlan()
// - setDuration()

/** 指定した日付ページに含まれる全てのタスクをcalendarに登録する
 *
 * @param init 登録先calendar IDを入れるobject
 */
export async function sync(project: string, title: string, init: SyncInit) {
  await syncPages(
    [{ project, title }],
    init,
  );
}

/** 選択範囲に含まれる日付の日付ページにある全てのタスクをcalendarに登録する
 *
 * ２つ以上の日付が含まれていたら、最初と最後の日付の期間中の全ての日付を対象とする
 * @param init 登録先calendar IDを入れるobject
 */
export async function syncFromSelection(init: SyncInit) {
  const dates = [...getDatesFromSelection()];
  if (dates.length === 0) return;
  if (dates.length === 1) {
    await syncPages(
      [{ project: scrapbox.Project.name, title: toTitle(dates[0]) }],
      init,
    );
    return;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  await syncPages(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ).map((date) => ({ project: scrapbox.Project.name, title: toTitle(date) })),
    init,
  );
}

/** 指定範囲内の全てのタスクを一括操作する
 *
 * @param start 選択範囲の先頭の行
 * @param end 選択範囲の末尾の行
 * @param change 各タスクに適用する操作
 */
async function modifyTasks(
  start: number,
  end: number,
  change: (
    /** 変更するタスク */ task: Task,
    /** タスクを取得した行の行番号 */ index: number,
  ) => Task,
) {
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
  await replaceLines(start, end, lines.join("\n"));
}

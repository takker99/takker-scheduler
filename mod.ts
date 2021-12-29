import { goHead, goLine } from "./lib/motion.ts";
import {
  deleteLines,
  insertLine,
  insertText,
  moveLinesBefore,
  replaceLines,
  upBlocks,
} from "./lib/edit.ts";
import { press } from "./lib/press.ts";
import { position } from "./lib/position.ts";
import {
  getCharDOM,
  getLine,
  getLineId,
  getLineNo,
  getLines,
  getText,
} from "./lib/node.ts";
import { range, rangeText } from "./lib/selection.ts";
import { parse, Task, toString } from "./task.ts";
import { getDate, getTitle } from "./diary.ts";
import {
  addDays,
  addMinutes,
  areIntervalsOverlapping,
  compareAsc,
  eachDayOfInterval,
  getHours,
  getMinutes,
  isAfter,
  isSameDay,
  isValid,
  lightFormat,
  set as setTime,
  subDays,
  subMinutes,
} from "./deps/date-fns.ts";
import { generatePlan } from "./plan.ts";
import { getDatesFromSelection } from "./utils.ts";
import { syncMultiPages } from "./sync.js";

//export {openLogPages} from '../takker-scheduler-3%2Flogger/script.js';

const interval = 5; // 5 minutes
/** カーソル行の下にタスクを追加する
 *
 * カーソル行がタスクだった場合は、そのタスクの日付と予定開始時刻、見積もり時間を引き継ぐ
 */
export async function addTask() {
  const linePos = position()?.line;
  const taskLine = parse(getText(linePos) ?? "");

  // 現在行がタスクなら、それと同じ日付にする
  // 違ったら今日にする
  const base = taskLine?.base ?? new Date();

  // 予定開始時刻と見積もり時間を計算する
  const plan = {
    start: taskLine?.plan?.start
      // 予定開始時刻は、その前のタスクの見積もり時間にintervalを足したものだけずらしておく
      ? addMinutes(
        taskLine.plan.start,
        interval + (taskLine.plan.duration ?? 0),
      )
      : undefined,
    duration: taskLine?.plan?.duration,
  };

  // カーソル行の下に書き込む
  await insertLine(
    (linePos ?? 0) + 1,
    toString({ title: "", base, plan, record: {} }),
  );
}

function getModifyRange() {
  const { start, end } = range() ?? {};
  const line = position()?.line ?? 0;
  const startNo = start?.line ?? line;
  const endNo = end?.line ?? line;
  return [startNo, endNo] as const;
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
  const linePos = position()?.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (end) return; // すでに終了していたら何もしない

  // 開始時刻をtoggleする
  await insertLine(
    linePos ?? 0,
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
  const linePos = position()?.line;
  const taskLine = parse(getText(linePos) ?? "");
  if (!taskLine) return; // タスクでなければ何もしない
  const { record: { start, end }, ...rest } = taskLine;
  if (!start) return; // まだ開始していなかったら何もしない

  // 終了時刻をtoggleする
  await insertLine(
    linePos ?? 0,
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
  const linePos = position()?.line;
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
  await insertLine(
    linePos ?? 0,
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
  const linePos = position()?.line;
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
  await insertLine(
    linePos ?? 0,
    toString({
      record: { start: prevEnd ?? now, end: now },
      ...rest,
    }),
  );
}

export async function sort() {
  if (scrapbox.Page.lines.length < 3) return;
  const startNo = 2;
  const endNo = scrapbox.Page.lines.length - 1;
  const sortedTasks = scrapbox.Page.lines
    .slice(startNo, 1 + endNo)
    .flatMap((line, i) => {
      const task = parse(i + startNo);
      return task ? [{ id: `L${line.id}`, task }] : [];
    })
    .sort((a, b) =>
      compareAsc(
        a.task.record?.start ?? a.task.plan?.start ?? a.task.date,
        b.task.record?.start ?? b.task.plan?.start ?? b.task.date,
      )
    );
  // 一番上から順に入れ替え作業をする
  for (let i = 0; i < sortedTasks.length; i++) {
    // taskの順番を計算する
    const presentPosition = scrapbox.Page.lines
      .slice(startNo, 1 + endNo)
      .filter((line) => !/^\s+/.test(line.text)) // top level indent lineのみ数える
      .findIndex((line) => `L${line.id}` === sortedTasks[i].id);
    //console.log({presentPosition});
    if (presentPosition === i) continue;
    await goLine(sortedTasks[i].id);
    upBlocks(presentPosition - i);
  }

  // 見出しもきれいにする
  insertSections();
}
async function insertSections() {
  const sections = [
    "[** 00:00 - 03:00] 未明",
    "[** 03:00 - 06:00] 明け方",
    "[** 06:00 - 09:00] 朝",
    "[** 09:00 - 12:00] 昼前",
    "[** 12:00 - 15:00] 昼過ぎ",
    "[** 15:00 - 18:00] 夕方",
    "[** 18:00 - 21:00] 夜のはじめ頃",
    "[** 21:00 - 00:00] 夜遅く",
  ];

  const pageDate = getDate();
  if (!isValid(pageDate)) return;

  // 前の日付ページへのリンクを挿入する
  const indexLine = `yesterday: [${getTitle(subDays(pageDate, 1))}]`;
  if (scrapbox.Page.lines.findIndex((line) => line.text === indexLine) !== -1) {
    const index = scrapbox.Page.lines.findIndex((line) =>
      line.text === indexLine
    );
    await goLine(index);
    moveLinesBefore({ from: index, to: 0 });
  } else {
    await insertLine(1, indexLine);
  }

  // 見出しを挿入する
  // 挿入位置を計算する
  const tasks = scrapbox.Page.lines
    .flatMap((_, lineNo) => {
      const task = parse(lineNo);
      return task ? [task] : [];
    });
  const insertIds = sections.map((_, i) => {
    // 最初と最後のsectionの挿入位置はわかっている
    if (i === 0) return { position: "previous", id: getLineId(tasks[0]) };

    // sectionの開始・終了時刻
    const sectionDates = {
      start: setTime(new Date(pageDate), { hours: i * 3, minutes: 0 }),
      end: setTime(new Date(pageDate), { hours: (i + 1) * 3, minutes: 0 }),
    };

    // 挿入位置を探す
    for (const task of tasks) {
      const { record, plan, baseDate, lineNo } = task;
      const start = record.start ?? plan.start ?? baseDate;
      const end = record.end ?? plan.start ?? baseDate;
      // sectionを跨いでいるタスクの場合
      if (areIntervalsOverlapping(sectionDates, { start, end })) {
        const forward = sectionDates.start.getTime() - start.getTime();
        const backward = end.getTime() - sectionDates.start.getTime();
        if (forward > backward && isAfter(sectionDates.end, end)) {
          // sectionのすぐ後ろに入るタスクと判断する
          //console.log(['border, next',_, l(lineNo).DOM]);
          return { id: getLineId(lineNo) };
        } else {
          // sectionのすぐ前に入るタスクと判断する
          //console.log(['border, previous',_ ,l(lineNo).DOM]);
          return { position: "previous", id: getLineId(lineNo) };
        }
      }
      // あとはどちらか一方にきれいに収まるタスクである場合しか無い
      // 前のタスクとの間にあるかどうかを調べる
      if (isAfter(sectionDates.start, start)) continue;

      const i = tasks.indexOf(task);
      const prev = tasks[i - 1];
      // sectionのすぐ後ろに入るタスクと判断する
      if (!prev) return { position: "previous", id: getLineId(lineNo) };
      const prevEnd = prev.record.end ?? prev.plan.start ?? prev.date;
      // sectionのすぐ後ろに入るタスクと判断する
      if (isAfter(sectionDates.start, prevEnd)) {
        return { position: "previous", id: getLineId(lineNo) };
      }
    }
    // 見つからなかったら末尾に入れる
    //console.log(['not found',_]);
    return { id: l(tasks[tasks.length - 1].lineNo).id };
  });
  //console.log(insertIds.map((id, i) => [sections[i], id.position, l(id.id).text, l(id.id).DOM]));

  // 見出しを挿入する
  for (const section of sections) {
    const id = scrapbox.Page.lines.find((line) => line.text === section)?.id;
    const { position, id: insertId } = insertIds[sections.indexOf(section)];
    if (id) {
      const insertNo = getLineNo(insertId) + (position === "previous" ? -1 : 0);
      await goLine(id);
      moveLinesBefore({ from: getLineNo(id), to: insertNo });
    } else {
      await goLine(insertId);
      if (position === "previous") {
        goHead();
        press("Enter");
        press("ArrowUp");
      } else {
        press("Enter");
        goHead();
        press("End", { shiftKey: true });
      }
      await insertText(section);
    }
  }
}
export async function transport({ targetProject }) {
  const diaryDate = getDate();

  // 検索する範囲
  const { startNo, endNo } = selection.exist
    ? (() => {
      const { start, end } = selection.range;
      //console.log({start,end});
      return { startNo: start.lineNo, endNo: end.lineNo };
    })()
    : // 選択範囲がなかったらタイトル行以外を選択する
      { startNo: 1, endNo: scrapbox.Page.lines.length - 1 };

  // 移動するタスクを取得する
  // 違う日付のタスクをすべて移動する
  const targetTaskLines = scrapbox.Page.lines
    .slice(startNo, endNo + 1)
    .flatMap((_, i) => {
      const taskLine = parse(i + startNo);
      if (!taskLine) return [];
      const { baseDate, lineNo } = taskLine;
      return isValid(diaryDate) && // 日付ページでなければ、全てのタスクを転送する
          isSameDay(baseDate, diaryDate)
        ? []
        : [{ date: baseDate, lineNo }];
    });

  // 日付ごとにタスクをまとめる
  const bodies = {};
  targetTaskLines.forEach(({ date, lineNo }) => {
    const key = lightFormat(date, "yyyy-MM-dd");
    bodies[key] = {
      date,
      texts: [
        ...(bodies[key]?.texts ?? []),
        // indent blockで移動させる
        ...scrapbox.Page.lines
          .slice(lineNo, lineNo + getLine(lineNo).text.length + 1)
          .map((line) => line.text),
      ],
    };
  });

  // 対象の行を削除する
  await deleteLines(targetTaskLines.map(({ line }) => line.id));

  // 新しいタブで開く
  for (const [, { date, texts }] of Object.entries(bodies)) {
    const body = encodeURIComponent(texts.join("\n"));
    window.open(
      `https://scrapbox.io/${targetProject}/${
        encodeURIComponent(getTitle(date))
      }?body=${body}`,
    );
  }
}

export async function makePlan(count) {
  await generatePlan([addDays(new Date(), count)], "takker-memex");
}
export async function makeWeekPlan(count) {
  const now = new Date();
  await generatePlan(
    [...array(7).keys()].map((i) => addDays(now, i + count)),
    "takker-memex",
  );
}

export async function walkPlanStart(minutes) {
  if (!selection.exist) {
    await _walkPlanStart(minutes);
  } else {
    const { start: { lineNo: startNo }, end: { lineNo: endNo } } =
      selection.range;
    for (let i = startNo; i <= endNo; i++) {
      await goLine(i);
      await _walkPlanStart(minutes);
    }
  }
}

async function _walkPlanStart(minutes) {
  const taskLine = parse(getLineNo(position().line));
  if (!taskLine) return; // タスクでなければ何もしない
  const date = (taskLine.plan?.start ??
    setTime(taskLine.baseDate, { hours: 0, minutes: 0 }));
  const newStart = minutes > 0
    ? addMinutes(date, minutes)
    : subMinutes(date, -minutes);
  await set(taskLine, {
    plan: { start: newStart, duration: taskLine.plan.duration ?? 0 },
  });
}

export async function walkPlanDuration(minutes) {
  if (!selection.exist) {
    await _walkPlanDuration(minutes);
  } else {
    const { start: { lineNo: startNo }, end: { lineNo: endNo } } =
      selection.range;
    for (let i = startNo; i <= endNo; i++) {
      await goLine(i);
      await _walkPlanDuration(minutes);
    }
  }
}

async function _walkPlanDuration(minutes) {
  const taskLine = parse(getLineNo(position().line));
  if (!taskLine) return; // タスクでなければ何もしない
  const newDuration = {
    minutes: (taskLine.plan.duration?.minutes ?? 0) + minutes,
  };
  await set(taskLine, {
    plan: { start: taskLine.plan.start, duration: newDuration },
  });
}
import { getValueFromInput } from "./lib/openInput.js";

export async function setPlan() {
  const taskLine = parse(getLineNo(position().line));
  if (!taskLine) return; // タスクでなければ何もしない
  const now = new Date();
  const date = (taskLine.plan?.start ??
    setTime(taskLine.baseDate, {
      hours: getHours(now),
      minutes: getMinutes(now),
    }));
  const { top, left } = getChar(postion().line, " yyyy-MM-dd h".length - 1)
    .getBoundingClientRect();
  const newStart = await getValueFromInput({
    type: "time",
    value: date,
    x: left,
    y: top,
  });
  scrapboxDOM.textInput.focus();
  await set(taskLine, {
    plan: { start: newStart, duration: taskLine.plan.duration ?? 0 },
  });
}
export async function setDuration() {
  const taskLine = parse(getLineNo(position().line));
  if (!taskLine) return; // タスクでなければ何もしない
  const { top, left } = getCharDOM(position().line, " yyyy-MM-dd h".length - 1)
    .getBoundingClientRect();
  const minutes = await getValueFromInput({
    type: "number",
    value: taskLine.plan.duration?.minutes ?? 0,
    x: left,
    y: top,
    max: 9999,
    min: 0,
  });
  await set(taskLine, {
    plan: { start: taskLine.plan.start, duration: { minutes } },
  });
}
export async function makePlanFromSelection({ minify = false } = {}) {
  const dates = getDatesFromSelection();
  if (dates.length === 0) return;
  if (dates.length === 1) {
    await generatePlan([dates[0]], "takker-memex", { minify });
    return;
  }
  const [start, end] = dates;
  await generatePlan(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    ),
    "takker-memex",
    { minify },
  );
  return;
}

export async function syncFromSelection() {
  const dates = getDatesFromSelection();
  if (dates.length === 0) return;
  if (dates.length === 1) {
    await syncMultiPages([{
      project: "takker-memex",
      title: getTitle(dates[0]),
    }]);
    return;
  }
  const start = dates[0];
  const end = dates.pop();
  await syncMultiPages(
    eachDayOfInterval(
      isAfter(end, start) ? { start, end } : { start: end, end: start },
    )
      .map((date) => ({ project: "takker-memex", title: getTitle(date) })),
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

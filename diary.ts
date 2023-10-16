import {
  addHours,
  compareAsc,
  isAfter,
  isValid,
  lightFormat,
  subDays,
} from "./deps/date-fns.ts";
import { endDate, parseLines, startDate, TaskBlock, toString } from "./task.ts";

const baseTitle = "日刊記録sheet";
const diaryRegExp = /日刊記録sheet (\d{4})-(\d{2})-(\d{2})/;
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

/** 日付ページかどうか判定する
 *
 * @param title 判定したいタイトル
 */
export const isDiaryPage = (title: string): boolean => diaryRegExp.test(title);

/** 日付ページのタイトルを日付に変換する
 *
 * 日付ページでないときは`undefined`を返す
 *
 * @param title 変換したいタイトル
 */
export const toDate = (title: string): Date | undefined => {
  const matched = title.match(diaryRegExp);
  if (!matched) return;
  const [, year, month, date] = matched;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(date));
  return isValid(d) ? d : undefined;
};

/** 日付から日付ページのタイトルを作る
 *
 * @param date 日付ページにしたい日付
 */
export const toTitle = (date: Date): string =>
  lightFormat(date, `'${baseTitle}' yyyy-MM-dd`);

/** タスクページをformatする
 *
 * 形式
 * - 1行目に`yesterday: [前日のタスクページ]`を置く
 * - 2行目以降にtask linesを並べる
 *   - 並び順の決め方
 *     - 実績開始日時の早い順に並べる
 *     - まだ開始されていないタスクは、代わりに予定開始時刻を使う
 *   - indentでtask lineにぶら下げた行はそのままの並び順を維持したままにする
 *   - 間に1日の時間細分図のラベルを挿入する
 * - ページ末尾にtask line以外の行を置く
 *   - 並べ替えはしない
 *
 * タスクページでなければ何もしないで返す
 *
 * @param lines formatしたいタスクページの全文(タイトル行も含む)
 */
export const format = (lines: string[]): string[] => {
  const today = toDate(lines[0]);
  if (!today) return lines;
  const label = makeBackLabel(today);

  // タスクとインデントのセットを取得する
  const taskBlocks: TaskBlock[] = [];
  const otherLines: string[] = []; // タスクブロック以外の行の番号
  for (const item of parseLines(lines.slice(1))) {
    if (typeof item === "string") {
      // 自動で挿入した行は外す
      if (sections.includes(item)) continue;
      if (label !== "" && label === item) continue;
      otherLines.push(item);
      continue;
    }
    taskBlocks.push(item);
  }

  // task blocksを並び替える
  const sortedTaskBlocks = taskBlocks.sort((a, b) =>
    compareAsc(startDate(a), startDate(b))
  );

  // 見出しを挿入する
  if (sortedTaskBlocks.length === 0) {
    // タスクがないときはそのまま入れる
    return [
      lines[0], // タイトル
      label, // 前日のページへのリンク
      ...sections, // 見出し
      ...otherLines, // タスク以外の行
    ];
  }

  // 見出しの挿入位置を決める
  const insertPoint = [0, 0, 0, 0, 0, 0, 0, 0]; // 指定した番号のtask blockの前に挿入する
  for (let i = 1; i < sections.length; i++) {
    // 最初は確定しているので飛ばす

    // 見出しの時間帯の始まりの時刻
    const start = addHours(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      3 * i,
    );

    // 見出しの時間帯内に開始する最初のタスク
    const lowerTaskIndex = sortedTaskBlocks.findIndex((task) =>
      isAfter(startDate(task), start)
    );

    // 見出し以降にタスクが一つもないとき
    if (lowerTaskIndex < 0) {
      insertPoint[i] = -1; // 末尾に挿入する
      continue;
    }
    // 一番最初のタスクから見出しに含まれるとき
    if (lowerTaskIndex === 0) continue; // 初期値のまま

    // 一つ前のタスクの長さで決める
    const task = sortedTaskBlocks[lowerTaskIndex - 1];
    const s = startDate(task);
    const e = endDate(task);
    insertPoint[i] =
      (e.getTime() - s.getTime()) / 2 < start.getTime() - s.getTime()
        ? lowerTaskIndex
        : lowerTaskIndex - 1;
  }

  return [
    lines[0], // タイトル
    label, // 前日のページへのリンク
    ...sortedTaskBlocks.flatMap((block, i) => [
      ...insertPoint.flatMap((j, k) => j === i ? [sections[k]] : []), // 見出し
      toString(block), // タスク
      ...block.lines, // タスクにぶら下がった行
    ]),
    ...insertPoint.flatMap((i, k) => i === -1 ? [sections[k]] : []),
    ...otherLines, // タスク以外の行
  ];
};

/** 前日の日付ページへのnavigationを作る */
const makeBackLabel = (today: Date) =>
  `yesterday: [${toTitle(subDays(today, 1))}]`;

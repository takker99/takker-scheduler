import { Status, Task } from "./parse.ts";
import { getMonth, getWeek, setWeek } from "../deps/date-fns.ts";

/** タスクを比較する
 *
 * 比較方法
 * 1. `startAt`の早いほう
 *    `startAt`がないときは、`startAt`のあるほうが早いとみなす
 * 2. 🚧 < ⬜ < 📝 < ⏳ < ✅ < ❌
 * 3. `name`の辞書式順序
 *
 * @param left 比較したいタスク
 * @param right 比較したいタスク
 * @return `left`のほうが早ければ`-1`, `right`のほうが早ければ`1`, 同じなら`0`を返す
 */
export const compare = (left: Task, right: Task): -1 | 0 | 1 => {
  const { startAt: lStartAt, ...lRest } = left;
  const { startAt: rStartAt, ...rRest } = right;
  if (!(lStartAt && rStartAt)) {
    if (lStartAt) return -1;
    if (rStartAt) return 1;
    const i = compareStatus(left.status, right.status);
    return i !== 0 ? i : compareName(left.name, right.name);
  }

  if (lStartAt.year !== rStartAt.year) {
    return lStartAt.year > rStartAt.year ? 1 : -1;
  }

  switch (lStartAt.type) {
    case "year":
      // 日時情報が細かい方を採用する
      if (rStartAt.type !== "year") return 1;
      break;
    case "week": {
      // 型エラー回避の分解
      const i = compareWeek({ startAt: lStartAt, ...lRest }, {
        startAt: rStartAt,
        ...rRest,
      });
      if (i === 0) break;
      return i;
    }
    case "month":
    case "date": {
      // 日時情報が細かい方を採用する
      switch (rStartAt.type) {
        case "year":
          return -1;
        case "week": {
          const i = -compareWeek(
            { startAt: rStartAt, ...rRest },
            { startAt: lStartAt, ...lRest },
          );
          if (i === 0) break;
          return i > 0 ? 1 : -1;
        }
        case "month":
        case "date": {
          if (lStartAt.month !== rStartAt.month) {
            return lStartAt.month > rStartAt.month ? 1 : -1;
          }
          // 日時情報が細かい方を採用する
          if (lStartAt.type !== rStartAt.type) {
            return lStartAt.type === "month" ? 1 : -1;
          }
          if (lStartAt.type === "month" || rStartAt.type === "month") break;
          if (lStartAt.date === rStartAt.date) {
            const lMinutes = (lStartAt.hours ?? 23) * 60 +
              (lStartAt.minutes ?? 59);
            const rMinutes = (rStartAt.hours ?? 23) * 60 +
              (rStartAt.minutes ?? 59);
            if (lMinutes === rMinutes) break;
            return lMinutes > rMinutes ? 1 : -1;
          }
          return lStartAt.date > rStartAt.date ? 1 : -1;
        }
      }
    }
  }

  const i = compareStatus(left.status, right.status);
  return i !== 0 ? i : compareName(left.name, right.name);
};

/** 片側が`type: "week"`だったときの比較関数 */
const compareWeek = (
  left: Omit<Task, "startAt"> & {
    startAt: { type: "week"; year: number; week: number };
  },
  right: Omit<Task, "startAt"> & {
    startAt: Exclude<Task["startAt"], undefined>;
  },
): -1 | 0 | 1 => {
  if (left.startAt.year !== right.startAt.year) {
    return left.startAt.year > right.startAt.year ? 1 : -1;
  }

  switch (right.startAt.type) {
    case "year":
      // 日時情報が細かい方を採用する
      return -1;
    case "week":
      return left.startAt.week === right.startAt.week
        ? 0
        : left.startAt.week > right.startAt.week
        ? 1
        : -1;
    case "month": {
      // 時差で2022-01-01が2021-12-31で処理されてしまう場合があるので、一月わざとずらしてある
      const month = getMonth(
        setWeek(new Date(left.startAt.year, 1, 0), left.startAt.week),
      );
      // 週初めが月より前か後かで判定する
      // 週終わりが月初めにかぶった場合は気にしない
      // 日時情報が細かい方を採用する
      return month > right.startAt.month ? 1 : -1;
    }
    case "date": {
      const week = getWeek(
        new Date(
          right.startAt.year,
          right.startAt.month,
          right.startAt.date,
        ),
      );
      // 日時情報が細かい方を採用する
      return left.startAt.week >= week ? 1 : -1;
    }
  }
};

// ↓が網羅されていない&&indexOfが-1になると、正常に判定できない可能性がある
const order = ["🚧", "⬜", "📝", "⏳", "✅", "❌"] as Status[];
const compareStatus = (left: Status, right: Status): -1 | 0 | 1 => {
  const i = order.indexOf(left) - order.indexOf(right);
  return i > 0 ? 1 : i < 0 ? -1 : 0;
};
const compareName = (left: string, right: string): 0 | 1 | -1 => {
  const i = left.localeCompare(right);
  return i > 0 ? 1 : i < 0 ? -1 : 0;
};

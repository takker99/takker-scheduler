import { subWeeks } from "../deps/date-fns.ts";

export type Status = "⬜" | "📝" | "🚧" | "⏳" | "✅" | "❌";
export const isStatus = (status: string): status is Status =>
  ["⬜", "📝", "🚧", "⏳", "✅", "❌"].includes(status);

export interface Task {
  /** task name */
  name: string;
  /** タスクの状態 */
  status: Status;
  /** 自分の意志では動かせない期日 */
  due?: Date;

  /** 予想所要時間 (単位はmin) **/
  duration?: number;

  /** いつ頃やりたいか
   *
   * 指定がない場合は、`due`の2週間前か今日のどちらか遅いほうを仮に入れておく。
   * `due`もないなら空にする
   */
  startAt?: {
    type: "date";
    year: number;
    month: number;
    date: number;
    hours?: number;
    minutes?: number;
  } | {
    type: "week";
    year: number;
    week: number;
  } | {
    type: "month";
    year: number;
    month: number;
  } | {
    type: "year";
    year: number;
  };

  /** 解析前の文字列 */
  raw: string;
}

/** Taskを解析する
 *
 * @param text Taskの文字列
 * @param [today] 現在時刻 debug用に外部から指定できるようにしてある
 */
export const parse = (text: string, today?: Date): Task | undefined => {
  const status = text.match(/^[\uFE00-\uFE0F]*([⬜📝🚧⏳✅❌])/u)?.[1] ?? "";
  if (!isStatus(status)) return;

  const dueData = detectDue(text);
  const due = dueData?.due;

  const startAtMatches = text.match(
    /@(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?:\/\d{2}:\d{2}|D\d{1,4})?|D\d{1,4})?|\d{4}(?:-\d{2}(?:-\d{2})?|-w\d{2})?(?:D\d+)?)/,
  );

  // タスク名を取り出す
  const name = [...text.replace(/^[\uFE00-\uFE0F]*/, "")].slice(1).join("")
    .replace(dueData?.raw ?? "", "")
    .replace(startAtMatches?.[0] ?? "", "")
    .trim();
  if (!startAtMatches) {
    if (!due) return { name, status, raw: text };

    // startAtがないときは、dueから仮の値を計算する
    const startAt_ = subWeeks(due, 2);
    today ??= new Date();
    const startAt = startAt_.getTime() > today.getTime() ? startAt_ : today;
    return {
      name,
      status,
      due,
      startAt: {
        type: "date",
        year: startAt.getFullYear(),
        month: startAt.getMonth(),
        date: startAt.getDate(),
      },
      raw: text,
    };
  }

  {
    const matches = startAtMatches[1].match(
      /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?:(\/)(\d{2}):(\d{2})|(D)(\d+))?/,
    );
    if (matches) {
      const [, year, month, date, hours, minutes, slash, h, m, d, duration] =
        matches;

      const startAt = {
        type: "date",
        year: parseInt(year),
        month: parseInt(month) - 1,
        date: parseInt(date),
        hours: parseInt(hours),
        minutes: parseInt(minutes),
      } as const;
      const task: Task = {
        name,
        status,
        startAt,
        ...(due ? { due } : {}),
        raw: text,
      };

      // 見積もり時間を計算する
      if (slash || d) {
        if (slash) {
          const start = new Date(
            startAt.year,
            startAt.month,
            startAt.date,
            startAt.hours,
            startAt.minutes,
          );
          const end = new Date(
            startAt.year,
            startAt.month,
            startAt.date,
            parseInt(h),
            parseInt(m),
          );

          task.duration = Math.max(
            0,
            end.getTime() >= start.getTime()
              ? Math.round((end.getTime() - start.getTime()) / 60000)
              // 終了時刻が開始時刻より早い場合は、日をまたいでいると判断する
              : Math.round((end.getTime() - start.getTime()) / 60000 + 1440),
          );
        } else {
          task.duration = parseInt(duration);
        }
      }
      return task;
    }
  }

  {
    const matches = startAtMatches[1].match(
      /(\d{4})-(\d{2})-(\d{2})(?:D(\d+))?/,
    );
    if (matches) {
      const [, year, month, date, duration] = matches;
      const task: Task = {
        name,
        status,
        ...(due ? { due } : {}),
        startAt: {
          type: "date",
          year: parseInt(year),
          month: parseInt(month) - 1,
          date: parseInt(date),
        },
        raw: text,
      };
      if (duration) {
        task.duration = parseInt(duration);
      }
      return task;
    }
  }

  {
    const matches = startAtMatches[1].match(/(\d{4})-w(\d{2})(?:D(\d+))?/);
    if (matches) {
      const [, year, week, duration] = matches;

      const task: Task = {
        name,
        status,
        ...(due ? { due } : {}),
        startAt: {
          type: "week",
          year: parseInt(year),
          week: parseInt(week),
        },
        raw: text,
      };
      if (duration) {
        task.duration = parseInt(duration);
      }
      return task;
    }
  }

  {
    const matches = startAtMatches[1].match(/(\d{4})-(\d{2})(?:D(\d+))?/);
    if (matches) {
      const [, year, month, duration] = matches;
      const task: Task = {
        name,
        status,
        ...(due ? { due } : {}),
        startAt: {
          type: "month",
          year: parseInt(year),
          month: parseInt(month) - 1,
        },
        raw: text,
      };
      if (duration) {
        task.duration = parseInt(duration);
      }
      return task;
    }
  }

  const matches = startAtMatches[1].match(/(\d{4})(?:D(\d+))?/);
  if (!matches) return;
  const [, year, duration] = matches;
  const task: Task = {
    name,
    status,
    ...(due ? { due } : {}),
    startAt: {
      type: "year",
      year: parseInt(year),
    },
    raw: text,
  };
  if (duration) {
    task.duration = parseInt(duration);
  }
  return task;
};

const detectDue = (text: string): { due: Date; raw: string } | undefined => {
  const dueMatches = text.match(/~(\d{4})-(\d{2})-(\d{2})/);
  if (!dueMatches) return;

  const due = new Date(
    parseInt(dueMatches[1]),
    parseInt(dueMatches[2]) - 1,
    parseInt(dueMatches[3]),
  );
  return { due, raw: dueMatches[0] };
};

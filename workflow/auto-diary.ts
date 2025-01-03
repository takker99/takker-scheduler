import {
  connect,
  disconnect,
  patch,
  ScrapboxSocket,
} from "../deps/scrapbox-websocket.ts";
import { Scrapbox, useStatusBar } from "../deps/scrapbox-std-dom.ts";
import { toTitleLc } from "../deps/scrapbox-std.ts";
import { eachDayOfInterval, isSameDay, lightFormat } from "../deps/date-fns.ts";
import { Task, toString } from "../task.ts";
import { format, toTitle } from "../diary.ts";
import { toTaskLine } from "../howm/toTaskLine.ts";
import { load } from "../deps/storage.ts";
import { isRecurrence, parse } from "../howm/parse.ts";
import { Key, toKey } from "./key.ts";
import { isErr, unwrapErr, unwrapOk } from "../deps/option-t.ts";
import { delay } from "../deps/async.ts";
declare const scrapbox: Scrapbox;

const project = "takker-memex";

/** 現在日までの日刊記録sheetを生成する */
export const main = async (
  start = new Date(2023, 0, 24),
): Promise<() => void | Promise<void>> => {
  if (scrapbox.Project.name !== project) return () => {};

  // scrapbox.Project.pagesが生成されるまで待つ
  // 生成したpagesはcacheしておく
  let pages = scrapbox.Project.pages;
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (pages.length === 0) {
        pages = scrapbox.Project.pages;
        return;
      }
      clearInterval(timer);
      resolve();
    }, 2000);
  });

  const callback = async () => {
    const now = new Date();
    const interval = { start, end: now };
    //console.debug(eachDayOfInterval(interval));

    // 生成する振り返りページの日付リスト
    const dates = eachDayOfInterval(interval).filter((date) => {
      const title = toTitle(date);
      const page = pages.find((page) => page.title === title);
      return !page || !page.exists;
    });
    //console.debug("create the following diaries:", dates)

    if (dates.length === 0) return;

    const { render, dispose } = useStatusBar();
    let socket: ScrapboxSocket | undefined;
    try {
      render(
        { type: "spinner" },
        { type: "text", text: `load tasks for ${dates.length} diary pages` },
      );

      const tasks = new Map<Key, Task[]>();
      const titleLcs = new Set<string>();
      const dayKeys = dates.map((date) => toKey(date));

      // projectにある全てのタスクリンクをtask lineに変換してtasksに格納する
      for (
        const { title: pageTitle, links, project } of await load([
          "takker",
          "takker-memex",
        ])
      ) {
        for (const title of [pageTitle, ...links]) {
          const result = parse(title);
          if (!result) continue;
          if (isErr(result)) {
            const { name, message } = unwrapErr(result);
            console.error(
              `[/${project}/${title}]: ${name} ${message}`,
            );
            continue;
          }

          // 重複除去
          const titleLc = toTitleLc(title);
          if (titleLcs.has(titleLc)) continue;
          titleLcs.add(titleLc);

          const task = unwrapOk(result);
          // 一部のステータスのタスクを除外する
          if (task.freshness?.status === "done") continue;

          for (const date of dates) {
            const task_ = toTaskLine(task, date);
            if (!task_) continue;
            const key = toKey(task_.base);
            if (!dayKeys.includes(key)) continue;
            tasks.set(key, [...(tasks.get(key) ?? []), task_]);
            // 繰り返しタスクでなければ、全ての日付を試す必要がない
            if (!isRecurrence(task)) continue;
          }
        }
      }

      // ページを作る
      const result = await connect();
      if (isErr(result)) throw unwrapErr(result);
      socket = unwrapOk(result);
      let counter = 0;
      render(
        { type: "spinner" },
        { type: "text", text: `create 0/${dates.length} diary pages...` },
      );
      for (const date of dates) {
        const title = toTitle(date);
        const lines = tasks.get(toKey(date))?.map?.((task) => toString(task)) ??
          [];
        const dateTag = `#${lightFormat(date, "yyyy-MM-dd")}`;
        const datetimeTag = `#${lightFormat(date, "yyyy-MM-dd HH:mm:ss")}`;

        await patch(
          project,
          title,
          (oldLines, { persistent }) => {
            // 新規作成のみ
            if (persistent) return;
            const newLines = [...oldLines.map((line) => line.text), ...lines];
            if (newLines.some((line) => line.includes(dateTag))) {
              return format(newLines);
            }
            return format([...newLines, datetimeTag]);
          },
          { socket },
        );

        counter++;
        render(
          { type: "spinner" },
          {
            type: "text",
            text: `create ${counter}/${dates.length} diary pages...`,
          },
        );
      }

      render(
        { type: "check-circle" },
        { type: "text", text: `created ${dates.length} diary pages.` },
      );
      start = now;
    } catch (e: unknown) {
      render(
        { type: "exclamation-triangle" },
        {
          type: "text",
          text: e instanceof Error
            ? `${e.name} ${e.message}`
            : `Unknown error! (see developper console)`,
        },
      );
      console.error(e);
    } finally {
      if (socket) await disconnect(socket);
      await delay(1000);
      dispose();
    }
  };

  let done = callback();

  // 日付変更線を越えるたびに実行
  // 端末がスリープするとタイマーが止まるので、10秒ごとにチェックする
  let checked = new Date();
  const timer = setInterval(() => {
    const now = new Date();
    if (isSameDay(checked, now)) return;
    checked = now;
    done.then(() => done = callback());
  }, 10000);

  return () => {
    clearTimeout(timer);
    return done;
  };
};

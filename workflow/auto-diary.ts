/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import {
  disconnect,
  makeSocket,
  patch,
  Socket,
} from "../deps/scrapbox-websocket.ts";
import { Scrapbox, useStatusBar } from "../deps/scrapbox-std-dom.ts";
import { sleep, toTitleLc } from "../deps/scrapbox-std.ts";
import { eachDayOfInterval, lightFormat } from "../deps/date-fns.ts";
import { Task, toString } from "../task.ts";
import { format, toTitle } from "../diary.ts";
import { toTaskLine } from "./toTaskLine.ts";
declare const scrapbox: Scrapbox;
import { decode, load } from "../deps/storage.ts";
import { makeRepeat, parse } from "../event/parse.ts";

const project = "takker-memex";

type Key = `${number}-${string}-${string}`;
/** 日付ごとに一意なkeyを生成する */
const toKey = (date: Date): Key =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${
    `${date.getDate()}`.padStart(2, "0")
  }`;

/** 現在日までの日刊記録sheetを生成する */
export const main = async () => {
  if (scrapbox.Project.name !== project) return;

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

  const start = new Date(2023, 0, 24);
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
  let socket: Socket | undefined;
  try {
    render(
      { type: "spinner" },
      { type: "text", text: `load tasks for ${dates.length} diary pages` },
    );

    const tasks = new Map<Key, Task[]>();
    const titleLcs = new Set<string>();
    const dayKeys = dates.map((date) => toKey(date));

    // projectにある全てのタスクリンクをtask lineに変換してtasksに格納する
    for (const { links, project } of await load(["takker", "takker-memex"])) {
      for (const link of links) {
        const { title } = decode(link);
        const result = parse(title);
        if (!result) continue;
        if (!result.ok) {
          console.error(
            `[/${project}/${title}]: ${result.value.name} ${result.value.message}`,
          );
          continue;
        }

        // 重複除去
        const titleLc = toTitleLc(title);
        if (titleLcs.has(titleLc)) continue;
        titleLcs.add(titleLc);

        // 一部のステータスのタスクを除外する
        if ("status" in result.value && result.value.status === "done") {
          continue;
        }

        if (!("recurrence" in result.value)) {
          const task = toTaskLine(result.value);
          // TODO: toTaskLineで済むようにしたい
          task.title = `[${result.value.raw}]`;
          const key = toKey(task.base);
          if (!dayKeys.includes(key)) continue;
          tasks.set(key, [...(tasks.get(key) ?? []), task]);
        } else {
          for (const date of dates) {
            const taskLink = makeRepeat(result.value, date);
            if (!taskLink) continue;
            const task = toTaskLine(taskLink);
            const key = toKey(task.base);
            tasks.set(key, [...(tasks.get(key) ?? []), task]);
          }
        }
      }
    }

    // ページを作る
    socket = await makeSocket();
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
    await sleep(1000);
    dispose();
  }
};

/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { Scrapbox, useStatusBar } from "../deps/scrapbox-std-dom.ts";
import { sleep } from "../deps/scrapbox-std.ts";
import { disconnect, makeSocket, Socket } from "../deps/scrapbox-websocket.ts";
import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
} from "../deps/date-fns.ts";
import { makePage, reviewTitle } from "./daily-review.ts";
import * as Weekly from "./weekly-review.ts";
declare const scrapbox: Scrapbox;

const project = "takker";

// 一回のみ実行する
// awaitはつけない
// - moduleのtop levelにあるので、awaitするとほかのmoduleの読み込みをblockしてしまう
(async () => {
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

  const start = new Date(2023, 1, 3);
  const now = new Date();
  const interval = { start, end: addDays(now, 1) };
  console.debug(eachDayOfInterval(interval));
  /* 生成する振り返りページの日付リスト */
  const dates = eachDayOfInterval(interval).filter((date) => {
    const title = reviewTitle(date);
    const page = pages.find((page) => page.title === title);
    return !page || !page.exists;
  });
  /* 生成する1週間の振り返りページの日付リスト */
  const weeklyDates = eachWeekOfInterval(interval).filter((date) => {
    const title = Weekly.reviewTitle(date);
    const page = pages.find((page) => page.title === title);
    return !page || !page.exists;
  });

  if (dates.length === 0 && weeklyDates.length === 0) return;

  const { render, dispose } = useStatusBar();
  let socket: Socket | undefined;
  try {
    // 今日以外の日付ページを外す
    let counter = dates.length + weeklyDates.length;
    render(
      { type: "spinner" },
      { type: "text", text: `create ${counter} review pages...` },
    );
    socket = await makeSocket();
    for (const date of dates) {
      await makePage(date, { project, socket });
      counter--;
      render(
        { type: "spinner" },
        { type: "text", text: `create ${counter} review pages...` },
      );
    }
    for (const date of weeklyDates) {
      await Weekly.makePage(date, { project, socket });
      counter--;
      render(
        { type: "spinner" },
        { type: "text", text: `create ${counter} review pages...` },
      );
    }

    render(
      { type: "check-circle" },
      {
        type: "text",
        text: `created ${dates.length + weeklyDates.length} review pages.`,
      },
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
})();

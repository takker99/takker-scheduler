import { Scrapbox, useStatusBar } from "../deps/scrapbox-std-dom.ts";
import { getCodeBlock } from "../deps/scrapbox-std.ts";
import {
  connect,
  disconnect,
  patch,
  ScrapboxSocket,
} from "../deps/scrapbox-websocket.ts";
import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  isSameDay,
} from "../deps/date-fns.ts";
import { template } from "./template.ts";
import { isErr, unwrapErr, unwrapOk } from "../deps/option-t.ts";
import { delay } from "../deps/async.ts";
declare const scrapbox: Scrapbox;

/**
 * Create daily and review pages.
 *
 * @param project - The name of the project.
 * @param dailyTemplate - The daily template for review pages.
 * @param weeklyTemplate - The weekly template for review pages.
 * @returns A Promise that resolves when the review pages are created.
 */
export const main = async (
  project: string,
  dailyTemplate: [string, string, string],
  weeklyTemplate: [string, string, string],
  start = new Date(2023, 1, 3),
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
    const interval = { start, end: addDays(now, 1) };

    const { render, dispose } = useStatusBar();
    let socket: ScrapboxSocket | undefined;
    try {
      // テンプレートを取得
      const dailyTemplateText = await fetchTemplate(dailyTemplate);
      const weeklyTemplateText = await fetchTemplate(weeklyTemplate);

      /* 生成する振り返りページの日付リスト */
      const dates = eachDayOfInterval(interval).filter((date) => {
        const title = template(date, dailyTemplateText)[0];
        const page = pages.find((page) => page.title === title);
        return !page || !page.exists;
      });
      /* 生成する1週間の振り返りページの日付リスト */
      const weeklyDates = eachWeekOfInterval(interval).filter((date) => {
        const title = template(date, weeklyTemplateText)[0];
        const page = pages.find((page) => page.title === title);
        return !page || !page.exists;
      });

      if (dates.length === 0 && weeklyDates.length === 0) return;

      // 今日以外の日付ページを外す
      let counter = dates.length + weeklyDates.length;
      render(
        { type: "spinner" },
        { type: "text", text: `create ${counter} review pages...` },
      );

      const result = await connect();
      if (isErr(result)) throw unwrapErr(result);
      socket = unwrapOk(result);
      for (
        const lines of [
          ...dates.map((date) => template(date, dailyTemplateText)),
          ...weeklyDates.map((date) => template(date, weeklyTemplateText)),
        ]
      ) {
        await patch(
          project,
          lines[0],
          (_, metadata) => metadata.persistent ? undefined : lines,
          socket ? { socket } : {},
        );
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

const fetchTemplate = async (path: [string, string, string]) => {
  const result = await getCodeBlock(path[0], path[1], path[2]);
  if (isErr(result)) {
    const error = new Error();
    error.name = unwrapErr(result).name;
    error.message = `${unwrapErr(result).message} at fetching /${path[0]}/${
      path[1]
    }/${path[2]}`;
    throw error;
  }

  const template = unwrapOk(result).split("\n");
  if (template.length === 0) {
    throw new Error(`template "/${path[0]}/${path[1]}/${path[2]}" is empty!`);
  }
  return template;
};

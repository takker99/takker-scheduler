import {
  addDays,
  getWeek,
  lightFormat,
  startOfWeek,
  subWeeks,
} from "../deps/date-fns.ts";
import { patch, Socket } from "../deps/scrapbox-websocket.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

const format = "yyyy-MM-dd";

export interface MakePageInit {
  project: string;
  created?: Date;
  socket?: Socket;
}

export const makePage = async (
  date: Date,
  { project, created, socket }: MakePageInit,
) => {
  const title = reviewTitle(date);

  await patch(
    project,
    title,
    (_, metadata) =>
      metadata.persistent
        ? undefined
        : [title, ...template(date, created ?? date)],
    socket ? { socket } : {},
  );
};

/** 振り返りページのタイトルを作る */
export const reviewTitle = (date: Date): string =>
  `${date.getFullYear()}-w${`${getWeek(date)}`.padStart(2, "0")} 振り返り`;

const template = (today: Date, created: Date): string[] => [
  `前回：[${reviewTitle(subWeeks(today, 1))}]`,
  "",
  "各論",
  ...[0, 1, 2, 3, 4, 5, 6].map(
    (i) => ` [/takker/${lightFormat(addDays(startOfWeek(today), i), format)}]`,
  ),
  "",
  "まとめ",
  " いつもと違うところ",
  "  うれしいこと",
  "  うれしくないこと",
  "  やったこと",
  "  やらなかったこと",
  "  工夫したこと",
  "  思いついたこと",
  "  その他",
  " いつもと変わらないところ",
  "  ",
  " 課題",
  "  ",
  "",
  `#${lightFormat(created, "yyyy-MM-dd HH:mm:ss")}`,
];

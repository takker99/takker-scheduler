import { addDays, getWeek, lightFormat, subDays } from "../deps/date-fns.ts";
import { patch, Socket } from "../deps/scrapbox-websocket.ts";

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
  `${lightFormat(date, format)} 振り返り`;

const template = (today: Date, created: Date): string[] => [
  "寝る前やること",
  " 1. 明日の天気確認",
  " 2. 明日やることを視界に入れる",
  " 3. [/takker/寝る前に見るページ]を見る",
  ` 4. [/takker/${lightFormat(subDays(today, 7), format)}]の行動を振り返る`,
  ` 5. [/takker-memex/昨日やり残したことと今日やること整理 ${
    lightFormat(today, format)
  }]を開いて、やり残したことと明日やることを貼り付ける`,
  ` 6. やり残したことを緊急度順に並び替える`,
  "",
  `↑${lightFormat(subDays(today, 1), format)}に書く`,
  "[/icons/hr.icon]",
  `↓${lightFormat(today, format)}に書く`,
  "",

  "1. [/takker/朝に見るページ]を見る",
  "2. やること整理",
  " 1. 5分タイマーをかける",
  "  タイマーをセットしたら、やることを整理することだけで頭をいっぱいにする",
  "  他のことはしない",
  " 2. 空きコマの分だけやり残したことを今日やることに移す",
  "  今週やることや今月やることから移してきてもいい",
  " 3. 他のやり残したことをいつやるか決める",
  "",
  `↑${lightFormat(today, format)}に書く`,
  "[/icons/hr.icon]",
  `↓${lightFormat(addDays(today, 1), format)}に書く`,
  " smartphoneでやる",
  "",
  "1. [/takker/昼に見るページ]を見る",
  "2. 振り返り",
  " 1. 2.5minタイマーをセット",
  " 2. Calendarを上から順に見て思いを馳せる",
  "  他に見るもの",
  `   [/takker-memex/日刊記録sheet ${lightFormat(today, format)}]`,
  `   [/takker/${lightFormat(today, format)}]`,
  "  時間があればやったこととか書く",
  "  タイマーが鳴ったら強制終了する",
  "   きりが悪ければ悪いほどよい",
  " 3. 2.5minタイマーを再びセット",
  ` 4. [${reviewTitle(subDays(today, 1))}]で振り返ったことを[/takker/${
    subDays(today, 1).getFullYear()
  }-w${`${getWeek(subDays(today, 1))}`.padStart(2, "0")} 振り返り]に書く`,
  `  適宜、[${reviewTitle(subDays(today, 1))}]と[/takker-memex/日刊記録sheet ${
    lightFormat(subDays(today, 1), format)
  }]にあることを切り出す`,
  "  同様に、タイマーが鳴ったら強制終了する",
  "",
  "",
  `#${lightFormat(created, "yyyy-MM-dd HH:mm:ss")}`,
];

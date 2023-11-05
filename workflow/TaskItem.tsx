/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */

import { FunctionComponent, h, useCallback, useMemo } from "../deps/preact.tsx";
import { Copy } from "./Copy.tsx";
import { encodeTitleURI } from "../deps/scrapbox-std.ts";
import { addMinutes, isAfter } from "../deps/date-fns.ts";
import { format, toDate } from "../howm/localDate.ts";
import { getDuration, getStart } from "../howm/parse.ts";
import { useMinutes } from "./useMinutes.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import { Action } from "./viewer.tsx";
import { toStatusLabel } from "./toStatusLabel.ts";
declare const scrapbox: Scrapbox;

/** タスクの情報を1行に表示する部品
 *
 * @param action 表示するタスク
 * @param onPageChanged タスクをクリックしたときに呼ばれる関数
 * @param pActions その他のタスク コピー用テキストを作成する時に使う
 */
export const TaskItem: FunctionComponent<
  { action: Action; onPageChanged: () => void; pActions: Action[] }
> = (
  { action, onPageChanged, pActions },
) => {
  const href = useMemo(
    () =>
      `https://${location.hostname}/${action.project}/${
        encodeTitleURI(action.raw)
      }`,
    [action.project, action.raw],
  );

  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

  const type = useMemo(() => toStatusLabel(action.freshness.status), [
    action.freshness.status,
  ]);
  const start = useMemo(() => {
    const time = format(getStart(action)).slice(11);
    return time || "     ";
  }, [getStart(action)]);
  const duration = useMemo(() => getDuration(action), [action]);
  const freshnessLevel = Math.floor(Math.round(action.score) / 7);

  const now = useMinutes();
  /** 現在時刻以降に実行日時が設定されていれば`true`
   *
   * 再配置したタスクかどうかを表している
   */
  const scheduled = useMemo(
    () =>
      action.executed !== undefined &&
      isAfter(
        addMinutes(toDate(action.executed.start), action.executed.duration),
        now,
      ),
    [action.executed?.start, action.executed?.duration, now],
  );

  /** コピー用テキスト */
  const text = useMemo(
    () => [...pActions, action].map((action) => `[${action.raw}]`).join("\n"),
    [pActions, action],
  );
  return (
    <li
      data-type={action.freshness.status}
      data-freshness={action.score.toFixed(0)}
      data-level={freshnessLevel}
      {...(freshnessLevel < 0
        ? {
          style: { opacity: taskOpacity(action).toFixed(2) },
        }
        : {})}
    >
      <Copy text={text} title="ここまでコピー" />
      <span className="label type">{type}</span>
      <i className={`label far fa-fw${scheduled ? " fa-bookmark" : ""}`} />
      <span className="label freshness">{action.score.toFixed(0)}</span>
      <time className="label start">{start}</time>
      <span className="label duration">{duration}m</span>
      {href
        ? (
          <a
            href={href}
            {...(action.project === scrapbox.Project.name ? ({}) : (
              {
                rel: "noopener noreferrer",
                target: "_blank",
              }
            ))}
            onClick={handleClick}
          >
            {action.name}
          </a>
        )
        : action.name}
    </li>
  );
};

/** 旬度に応じて表示するタスクの透明度を変える
 *
 * 旬度0で70%, 旬度-7で60%になるよう調節した
 */
const taskOpacity = (action: Action): number =>
  Math.max(
    0.8 * Math.exp(Math.log(8 / 7) / 7 * action.score),
    0.05,
  );

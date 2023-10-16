/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import {
  Fragment,
  FunctionComponent,
  h,
  render,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "../deps/preact.tsx";
import { useTaskCrawler } from "./useTaskCrawler.ts";
import { useDialog } from "./useDialog.ts";
import { CSS } from "./viewer.min.css.ts";
import { Copy } from "./Copy.tsx";
import { encodeTitleURI } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import {
  addDays,
  eachDayOfInterval,
  isSameDay,
  lightFormat,
} from "../deps/date-fns.ts";
import { format, fromDate, isBefore, toDate } from "../howm/localDate.ts";
import { calcFreshness } from "../howm/freshness.ts";
import { getDuration, getEnd, getStart, Reminder } from "../howm/parse.ts";
import { compareFn } from "../howm/sort.ts";
import { Status } from "../howm/status.ts";
import { Key, toKey, toLocalDate } from "./key.ts";
declare const scrapbox: Scrapbox;

export interface Controller {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const setup = (projects: string[]): Promise<Controller> => {
  const app = document.createElement("div");
  app.dataset.userscriptName = "takker-workflow@0.0.1/next-action-viewer";
  const shadowRoot = app.attachShadow({ mode: "open" });
  document.body.append(app);
  return new Promise(
    (resolve) =>
      render(
        <App
          getController={(controller) => resolve(controller)}
          projects={projects}
        />,
        shadowRoot,
      ),
  );
};

/** renderに使う、分類分けされたタスクリンクの情報 */
interface Tree {
  /** 分類名 */
  summary: string;

  /** タスクリンク */
  actions: Action[];
}
interface Action extends Reminder {
  project: string;
  score: number;
}

interface Props {
  getController: (controller: Controller) => void;
  projects: string[];
}
const App = ({ getController, projects }: Props) => {
  const { tasks, errors, load, loading } = useTaskCrawler(projects);
  const { pageNo, next, prev } = useNavigation();

  /** 表示するタスク */
  const actions: Action[] = useMemo(() => {
    if (pageNo === "errors") {
      return errors.map((error) => ({
        name: `${error.title}\nname:${error.name}\nmessage:${error.message}`,
        raw: error.title,
        freshness: {
          refDate: { year: 9999, month: 1, date: 1 },
          status: "todo" as Status,
        },
        project: error.project,
        score: -Infinity,
      }));
    }

    if (pageNo === "expired") {
      const now = new Date();
      return tasks.filter((task) => isBefore(getEnd(task), fromDate(now)))
        .sort((a, b) => isBefore(getStart(a), getStart(b)) ? -1 : 0)
        .flatMap((task) => {
          if (!task.freshness || task.freshness.status === "done") return [];
          return [{ ...task, score: -Infinity }] as Action[];
        });
    }

    const date = toDate(toLocalDate(pageNo))!;
    return tasks.flatMap((task) => {
      if (!task.freshness) return [];
      const score = calcFreshness(task.freshness, date);
      return score > -999 ? [{ ...task, score } as Action] : [];
    }).sort(compareFn);
  }, [tasks, errors, pageNo]);

  // UIの開閉
  const { ref, open, close, toggle } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useCallback((e: Event) => e.stopPropagation(), []);

  /** コピー用テキスト */
  const text = useMemo(
    () => [pageNo, ...actions.map((action) => ` [${action.raw}]`)].join("\n"),
    [actions, pageNo],
  );

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref} onClick={close}>
        <div className="controller" onClick={stopPropagation}>
          <Copy text={text} title="Copy All Tasks" />
          <span>{pageNo}</span>
          <ProgressBar loading={loading} />
          <button className="navi left" onClick={prev}>{"<-"}</button>
          <button className="navi right" onClick={next}>{"->"}</button>
          <button className="reload" onClick={load} disabled={loading}>
            request reload
          </button>
          <button className="close" onClick={close}>X</button>
        </div>
        <ul className="result" onClick={stopPropagation} data-page-no={pageNo}>
          {actions.map((action, i) => (
            <TaskItem
              action={action}
              pActions={actions.slice(0, i)}
              onPageChanged={close}
            />
          ))}
        </ul>
      </dialog>
    </>
  );
};

const TaskItem: FunctionComponent<
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

  const type = useMemo(() => {
    switch (action.freshness.status) {
      case "todo":
        return "ToDo";
      case "note":
        return "覚書";
      case "deadline":
        return "締切";
      case "up-down":
        return "浮遊";
      case "done":
        return "完了";
    }
  }, [action.freshness]);
  const start = useMemo(() => {
    const time = format(getStart(action)).slice(11);
    return time || "     ";
  }, [getStart(action)]);
  const duration = useMemo(() => getDuration(action), [action]);
  const freshnessLevel = Math.floor(Math.round(action.score) / 7);

  /** コピー用テキスト */
  const text = useMemo(
    () => [...pActions, action].map((action) => `[${action.raw}]`).join("\n"),
    [pActions, action],
  );
  return (
    <li
      data-type={type}
      data-freshness={action.score.toFixed(0)}
      data-level={freshnessLevel}
      {...(freshnessLevel < 0
        ? {
          style: {
            opacity: Math.max(
              // 旬度0で70%, 旬度-7で60%になるよう調節した
              0.8 * Math.exp(Math.log(8 / 7) / 7 * action.score),
              0.05,
            ).toFixed(2),
          },
        }
        : {})}
    >
      <Copy text={text} title="ここまでコピー" />
      <span className="label type">{type}</span>
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

type PageNo = Key | "expired" | "errors";

const useNavigation = (
  defaultPageNo: PageNo = toKey(new Date()),
) => {
  /** 日付の場合は現在表示しているタスクリストの基準点を表す
   * `expired`のときはやり残した予定を表示する
   * `error`のときはエラーを表示する
   */
  const [pageNo, setPageNo] = useState<PageNo>(defaultPageNo);

  const next = useCallback(() => {
    setPageNo((pageNo) => {
      switch (pageNo) {
        case "errors":
          return "expired";
        case "expired":
          return toKey(new Date());
        default: {
          const date = toDate(toLocalDate(pageNo));
          date.setDate(date.getDate() + 1);
          return toKey(date);
        }
      }
    });
  }, []);
  const prev = useCallback(() => {
    setPageNo((pageNo) => {
      const nowKey = toKey(new Date());
      switch (pageNo) {
        case "errors":
          return "errors";
        case "expired":
          return "errors";
        case nowKey:
          return "expired";
        default: {
          const date = toDate(toLocalDate(pageNo));
          date.setDate(date.getDate() - 1);
          return toKey(date);
        }
      }
    });
  }, []);

  return { pageNo, next, prev };
};

/** 読み込み状況を表示する部品 */
const ProgressBar = (
  { loading }: { loading: boolean },
) => (loading
  ? (
    <div className="progress">
      <i className="fa fa-spinner" />
      <span>{"loading tasks..."}</span>
    </div>
  )
  : <div className="progress" />);

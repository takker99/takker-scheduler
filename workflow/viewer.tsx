/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />
/** @jsx h */
/** @jsxFrag Fragment */

import {
  Fragment,
  h,
  render,
  useCallback,
  useEffect,
  useMemo,
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
import { format, fromDate, isBefore } from "../howm/localDate.ts";
import { calcFreshness } from "../howm/freshness.ts";
import { getDuration, getEnd, getStart, Reminder } from "../howm/parse.ts";
import { compareFn } from "../howm/sort.ts";
import { Status } from "../howm/status.ts";
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

  // 当日から4週間分のタスクのみ抽出する
  const trees: Tree[] = useMemo(() => {
    const now = new Date();

    const trees = eachDayOfInterval({ start: now, end: addDays(now, 28) })
      .map((date) => {
        const isNow = isSameDay(now, date);
        const summary = lightFormat(date, "yyyy-MM-dd");
        const actions: Action[] = tasks.flatMap((task) => {
          if (!task.freshness) return [];
          const score = calcFreshness(task.freshness, date);
          return score > -999 &&
              (isNow || task.freshness.status === "deadline")
            ? [{ ...task, score } as Action]
            : [];
        });

        return {
          summary,
          actions,
        };
      });

    {
      // 締め切りタスクはずっと未来に残り続けるので、やり残しを探す必要はない
      /** やり残した予定 */
      const restActions: Action[] = tasks.filter((task) =>
        isBefore(getEnd(task), fromDate(now))
      )
        .sort((a, b) => isBefore(getStart(a), getStart(b)) ? -1 : 0)
        .flatMap((task) => {
          if (task.freshness) return [];
          return [{ ...task, score: -Infinity }] as Action[];
        });

      const summary = "やり残した予定";
      trees.unshift({
        summary,
        actions: restActions,
      });
    }

    // エラーがあれば、それも表示する
    if (errors.length > 0) {
      const summary = "error";
      const actions = errors.map((error) => ({
        name: `${error.title}\nname:${error.name}\nmessage:${error.message}`,
        raw: error.title,
        freshness: {
          refDate: { year: 9999, month: 1, date: 1 },
          status: "todo" as Status,
        },
        project: error.project,
        score: -Infinity,
      }));
      trees.push({
        summary,
        actions,
      });
    }

    return trees;
  }, [tasks, errors]);

  // UIの開閉
  const { ref, open, close, toggle } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  /** dialogクリックではmodalを閉じないようにする */
  const stopPropagation = useCallback((e: Event) => e.stopPropagation(), []);

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref} onClick={close}>
        <div className="controller" onClick={stopPropagation}>
          <button className="close" onClick={close}>X</button>
          <button className="reload" onClick={load} disabled={loading}>
            request reload
          </button>
          <ProgressBar loading={loading} />
        </div>
        <div className="result" onClick={stopPropagation}>
          {trees.map((tree) => (
            <TreeComponent
              tree={tree}
              key={tree.summary}
              onPageChanged={close}
            />
          ))}
        </div>
      </dialog>
    </>
  );
};

const TreeComponent = (
  { tree, onPageChanged }: { tree: Tree; onPageChanged: () => void },
) => {
  const actions = useMemo(() => tree.actions.sort(compareFn), [
    tree.actions,
  ]);
  const copyText = useMemo(() =>
    [
      tree.summary,
      ...actions.map((action) => ` [${action.raw}]`),
    ].join("\n"), [tree.summary, actions]);

  return tree.actions.length === 0
    ? <div key={tree.summary}>{tree.summary}</div>
    : (
      // 一部のカテゴリだけ最初から開いておく
      <details
        open={lightFormat(new Date(), "yyyy-MM-dd") === tree.summary}
      >
        <summary>
          {tree.summary}
          <Copy text={copyText} />
        </summary>
        <ul>
          {actions.map((action) => (
            <TaskItem action={action} onPageChanged={onPageChanged} />
          ))}
        </ul>
      </details>
    );
};

const TaskItem = (
  { action, onPageChanged }: { action: Action; onPageChanged: () => void },
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

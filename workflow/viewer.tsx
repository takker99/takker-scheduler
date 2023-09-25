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
import { format, fromDate, isBefore } from "./localDate.ts";
import { calcFreshness } from "./freshness.ts";
import { getDuration, getEnd, makeRepeat, Status, Task } from "./parse.ts";
import { compareFn } from "./sort.ts";
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
interface Action extends Task {
  project: string;
  freshness: number;
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
          const generatedTask = makeRepeat(task, fromDate(date));
          if (generatedTask) {
            const freshness = calcFreshness(generatedTask, date);
            return [{
              ...generatedTask,
              repeat: task.repeat,
              project: task.project,
              freshness,
            } as Action];
          }
          const freshness = calcFreshness(task, date);
          return freshness > -999 &&
              (isNow || task.status === "schedule" ||
                task.status === "deadline")
            ? [{ ...task, freshness } as Action]
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
      const restActions = tasks.filter((task) =>
        task.status === "schedule" && isBefore(getEnd(task), fromDate(now)) &&
        !task.repeat
      )
        .sort((a, b) => isBefore(a.start, b.start) ? -1 : 0)
        .map((task) => ({ ...task, freshness: -Infinity }));

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
        start: { year: 9999, month: 1, date: 1 },
        project: error.project,
        status: "todo" as Status,
        freshness: -Infinity,
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
      ...actions.flatMap((action) => action.repeat ? [] : [` [${action.raw}]`]),
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
      action.repeat
        ? ""
        : `https://${location.hostname}/${action.project}/${
          encodeTitleURI(action.raw)
        }`,
    [action.repeat, action.project, action.raw],
  );

  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

  const type = useMemo(() => {
    switch (action.status) {
      case "schedule":
        return "予定";
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
  }, [action.status]);
  const start = useMemo(() => {
    const time = format(action.start).slice(11);
    return time || "     ";
  }, [action.start]);
  const duration = useMemo(() => getDuration(action), [action]);
  const freshnessLevel = Math.floor(Math.round(action.freshness) / 7);

  return (
    <li
      data-type={type}
      data-freshness={action.freshness.toFixed(2)}
      data-level={freshnessLevel}
    >
      <span className="label type">{type}</span>
      <i className={`label fa fa-fw${action.repeat ? " fa-sync" : ""}`} />
      <span className="label freshness">{action.freshness.toFixed(0)}</span>
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

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
  useState,
} from "../deps/preact.tsx";
import { useTaskCrawler } from "./useTaskCrawler.ts";
import { useDialog } from "./useDialog.ts";
import { CSS } from "./viewer.min.css.ts";
import { encodeTitleURI, sleep } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
import {
  addDays,
  eachDayOfInterval,
  isSameDay,
  lightFormat,
  subDays,
} from "../deps/date-fns.ts";
import { isBefore } from "./localDate.ts";
import { calcFreshness } from "./freshness.ts";
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
  /** `actions`に含まれる全てのタスクリンクをScrapbox記法で格納しておく */
  copyText: string;
  /** タスクリンク */
  actions: Action[];
}
interface Action {
  /** 解析前のリンクの文字列 */
  title: string;
  project: string;
  freshness: number;
  /** タスクリンクのURL */
  href: string;
}

interface Props {
  getController: (controller: Controller) => void;
  projects: string[];
}
const App = ({ getController, projects }: Props) => {
  const { tasks, errors, load, loading } = useTaskCrawler(projects);

  // ±2週間分のタスクのみ抽出する
  const trees: Tree[] = useMemo(() => {
    const now = new Date();

    return eachDayOfInterval({ start: subDays(now, 14), end: addDays(now, 14) })
      .map((date) => {
        const isNow = isSameDay(now, date);
        const summary = lightFormat(date, "yyyy-MM-dd");
        const actions = tasks.flatMap((task) => {
          const freshness = calcFreshness(task, date);
          return freshness > -999 &&
              (isNow || task.status === "schedule" ||
                task.status === "deadline")
            ? [[task, freshness]] as const
            : [];
        })
          // 旬度順と開始日時順に並べ替える
          .sort((a, b) =>
            b[1] !== a[1]
              ? b[1] - a[1]
              : isBefore(a[0].start, b[0].start)
              ? -1
              : 1
            // UI向けに変換
          ).map(([task, freshness]) => ({
            title: task.title,
            project: task.project,
            freshness,
            href: `https://${location.hostname}/${task.project}/${
              encodeTitleURI(task.title)
            }`,
          }));

        return {
          summary,
          actions,
          // コピー処理を作る
          copyText: [
            summary,
            ...actions.map(({ title }) => ` [${title}]`),
            "",
          ].join("\n"),
        };
      });
  }, [tasks]);

  // UIの開閉
  const { ref, open, close, toggle } = useDialog();
  useEffect(() => getController({ open, close, toggle }), [getController]);

  useEffect(() => console.error(errors), [errors]);

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
  if (tree.actions.length === 0) {
    return <div key={tree.summary}>{tree.summary}</div>;
  }

  return (
    // 一部のカテゴリだけ最初から開いておく
    <details
      open={lightFormat(new Date(), "yyyy-MM-dd") === tree.summary}
    >
      <summary>
        {tree.summary}
        <Copy text={tree.copyText} />
      </summary>
      <ul>
        {tree.actions.map((action) => (
          <li key={action.title}>
            <Link {...action} onPageChanged={onPageChanged} />
          </li>
        ))}
      </ul>
    </details>
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

/** リンク
 *
 * - 今開いているページのprojectと同じリンクかどうかで処理を切り替える
 * - 同じタブでページ遷移する場合はmodalを閉じる
 */
const Link = (
  { href, project, title, freshness, onPageChanged }:
    & { onPageChanged: () => void }
    & Action,
) => {
  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

  if (project === scrapbox.Project.name) {
    return (
      <a
        href={href}
        data-freshness={freshness.toFixed(2)}
        onClick={handleClick}
      >
        {title}
      </a>
    );
  } else {
    return (
      <a
        href={href}
        data-freshness={freshness.toFixed(2)}
        rel="noopener noreferrer"
        target="_blank"
        onClick={handleClick}
      >
        {title}
      </a>
    );
  }
};

/** コピーボタン */
const Copy = ({ text }: { text: string }) => {
  const [buttonLabel, setButtonLabel] = useState("\uf0c5");
  const handleClick = useCallback(
    async (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setButtonLabel("Copied");
        await sleep(1000);
        setButtonLabel("\uf0c5");
      } catch (e) {
        alert(`Failed to copy the code block\nError:${e.message}`);
      }
    },
    [text],
  );

  return (
    <button className="copy" title="Copy" onClick={handleClick}>
      {buttonLabel}
    </button>
  );
};

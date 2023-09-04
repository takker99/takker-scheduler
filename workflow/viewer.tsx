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
import { Category, Task, useTaskCrawler } from "./useTaskCrawler.ts";
import { compare } from "./compare.ts";
import { useDialog } from "./useDialog.ts";
import { CSS } from "./viewer.min.css.ts";
import { encodeTitleURI, sleep } from "../deps/scrapbox-std.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
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
  /** タスクリンクのURL */
  href: string;
}

interface Props {
  getController: (controller: Controller) => void;
  projects: string[];
}
const App = ({ getController, projects }: Props) => {
  const { tasks, load, loading } = useTaskCrawler(projects);

  // 未完了のタスクだけ集めて、render用の形式に加工する
  const trees: Tree[] = useMemo(() => {
    const categories: {
      summary: string;
      category: Category;
      tasks: Task[];
    }[] = [
      { summary: "やり残していること", category: "missed", tasks: [] },
      { summary: "今日やること", category: "today", tasks: [] },
      { summary: "明日やること", category: "tomorrow", tasks: [] },
      { summary: "今週やること", category: "in week", tasks: [] },
      { summary: "来週やること", category: "in next week", tasks: [] },
      { summary: "今月やること", category: "in month", tasks: [] },
      { summary: "来月やること", category: "in next month", tasks: [] },
      { summary: "今年やること", category: "in year", tasks: [] },
      { summary: "来年やること", category: "in next year", tasks: [] },
      { summary: "いつかやること", category: "someday", tasks: [] },
      { summary: "時間情報なし", category: "no startAt", tasks: [] },
    ];

    // categoryごとに仕分ける
    for (const task of tasks) {
      if (task.status === "✅") continue;
      if (task.status === "❌") continue;

      categories.find(({ category }) => category === task.category)?.tasks
        ?.push?.(task);
    }

    return categories.map((category) => ({
      summary: category.summary,
      // 並び替え&変換
      actions: category.tasks.sort((a, b) => compare(a, b)).map((task) => ({
        title: task.title,
        project: task.project,
        href: `https://${location.hostname}/${task.project}/${
          encodeTitleURI(task.title)
        }`,
      })),
      // コピー処理を作る
      copyText: [
        category.summary,
        ...category.tasks.map((task) => ` [${task.title}]`),
        "",
      ].join("\n"),
    }));
  }, [tasks]);

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
          {trees.map((tree) =>
            tree.actions.length === 0
              ? <div key={tree.summary}>{tree.summary}</div>
              : (
                // 一部のカテゴリだけ最初から開いておく
                <details
                  key={tree.summary}
                  open={["今日やること", "やり残していること"].includes(
                    tree.summary,
                  )}
                >
                  <summary>
                    {tree.summary}
                    <Copy text={tree.copyText} />
                  </summary>
                  <ul>
                    {tree.actions.map((action) => (
                      <li key={action.title}>
                        <Link {...action} onPageChanged={close} />
                      </li>
                    ))}
                  </ul>
                </details>
              )
          )}
        </div>
      </dialog>
    </>
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
  { href, project, title, onPageChanged }: {
    href: string;
    project: string;
    title: string;
    onPageChanged: () => void;
  },
) => {
  // 同じタブで別のページに遷移したときはmodalを閉じる
  const handleClick = useCallback(() => {
    scrapbox.once("page:changed", onPageChanged);
    // 2秒以内に遷移しなかったら何もしない
    setTimeout(() => scrapbox.off("page:changed", onPageChanged), 2000);
  }, []);

  if (project === scrapbox.Project.name) {
    return <a href={href} onClick={handleClick}>{title}</a>;
  } else {
    return (
      <a
        href={href}
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

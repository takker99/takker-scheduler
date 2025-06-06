/** @jsxRuntime automatic */
/** @jsxImportSource npm:preact@10 */
import { render, useMemo } from "../../deps/preact.tsx";
import { useTaskCrawler } from "../useTaskCrawler.ts";
import { useDialog } from "../useDialog.ts";
import { CSS } from "../viewer.min.css.ts";
import { Copy } from "../Copy.tsx";
import { fromDate, isBefore, toDate } from "../../howm/localDate.ts";
import { calcFreshness } from "../../howm/freshness.ts";
import {
  getEnd,
  getStart,
  isRecurrence,
  isReminder,
  Reminder,
} from "../../howm/parse.ts";
import { Period } from "../../howm/Period.ts";
import { compareFn } from "../../howm/sort.ts";
import { Status } from "../../howm/status.ts";
import { toLocalDate } from "../key.ts";
import { LoadButton } from "../LoadButton.tsx";
import { TaskItem } from "./TaskItem.tsx";
import { useNavigation } from "./useNavigation.ts";
import { useUserScriptEvent } from "../useUserScriptEvent.ts";
import { useExports } from "../useExports.ts";

export interface ValidController {
  /** calendarを開く */
  open: () => void;
  /** calendarを閉じる */
  close: () => void;
}
export type InvalidController = Record<keyof ValidController, undefined>;
/** calenedarのcontroller
 *
 * methodsは{@link ValidController}を参照
 *
 * calendarがumountされた後は{@link InvalidController}(全てのmethodsが`undefined`)になる
 */
export type Controller = ValidController | InvalidController;

export const setup = (projects: string[]): Promise<Controller> => {
  const app = document.createElement("div");
  app.dataset.userscriptName = "takker-workflow@0.0.1/next-action-viewer";
  const shadowRoot = app.attachShadow({ mode: "open" });
  document.body.append(app);
  return new Promise(
    (resolve) =>
      render(<App getController={resolve} projects={projects} />, shadowRoot),
  );
};

export interface Action extends Reminder {
  executed?: Period;
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
      // エラーになったタスクを表示
      return errors.map((error) => ({
        name: `${error.title}\nname:${error.name}\nmessage:${error.message}`,
        raw: error.title,
        freshness: {
          refDate: { year: 9999, month: 1, date: 1 },
          status: "todo" as Status,
        },
        project: error.project,
        generated: true,
        score: 0,
      }));
    }

    if (pageNo === "expired") {
      // 期限切れの予定を表示
      // タスクは表示しない
      const now = new Date();
      return tasks.flatMap<Action>((task) =>
        !isReminder(task) && isBefore(getEnd(task), fromDate(now)) &&
          task.freshness === undefined && task.recurrence === undefined
          ? [
            {
              ...task,
              score: 0,
              freshness: { refDate: task.executed.start, status: "todo" },
            },
          ]
          : []
      )
        .sort((a, b) => isBefore(getStart(a), getStart(b)) ? -1 : 0);
    }

    const date = toDate(toLocalDate(pageNo))!;
    // 指定された日付を起点に計算した旬度に基づいてソートする
    // 一応、一定未満の旬度のタスクは表示しないが、正直この制限はいらないように思う
    return tasks.flatMap((task) => {
      if (!task.freshness) return [];
      if (isRecurrence(task)) return [];
      const score = calcFreshness(task.freshness, date);
      return score > -999 ? [{ ...task, score } as Action] : [];
    }).sort(compareFn);
  }, [tasks, errors, pageNo]);

  // UIの開閉
  const { ref, open, close } = useDialog();
  useExports(getController, { open, close });

  /** コピー用テキスト */
  const text = useMemo(
    () => [pageNo, ...actions.map((action) => ` [${action.raw}]`)].join("\n"),
    [actions, pageNo],
  );

  // 同じタブで別のページに遷移したときはmodalを閉じる
  useUserScriptEvent("page:changed", close);

  return (
    <>
      <style>{CSS}</style>
      <dialog ref={ref}>
        <div className="controller">
          <Copy text={text} title="Copy All Tasks" />
          <span>{pageNo}</span>
          <button type="button" className="navi left" onClick={prev}></button>
          <button type="button" className="navi right" onClick={next}></button>
          <LoadButton loading={loading} onClick={load} />
          <button type="button" className="close" onClick={close}></button>
        </div>
        <ul className="result task-list" data-page-no={pageNo}>
          {actions.map((action, i) => (
            <TaskItem
              key={action.raw}
              action={action}
              pActions={actions.slice(0, i)}
            />
          ))}
        </ul>
      </dialog>
    </>
  );
};

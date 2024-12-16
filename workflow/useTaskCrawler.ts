import { useMemo, useSyncExternalStore } from "../deps/preact.tsx";
import {
  InvalidDateError,
  parse,
  Task as TaskBase,
  TaskRangeError,
} from "../howm/parse.ts";
import { check, Link, load as loadLinks, subscribe } from "../deps/storage.ts";
import { toTitleLc } from "../deps/scrapbox-std.ts";
import { Path } from "./path.ts";
import { isErr, unwrapErr, unwrapOk } from "../deps/option-t.ts";

export type { InvalidDateError, TaskBase, TaskRangeError };
export type Task = TaskBase & Path;

export type TaskError = Path & (InvalidDateError | TaskRangeError);

export interface UseTaskCrawlerResult {
  /** 読み込んだ予定とタスク */
  tasks: Task[];
  /** 構文エラーが生じたタスクのエラー情報 */
  errors: TaskError[];
  /** タスクを読み込む */
  load: () => Promise<void>;
  /** 予定・タスクを読み込み中なら`true` */
  loading: boolean;
}

/** 指定されたprojectsから予定とタスクをすべて読み込むhook
 *
 * @param projects 読み込むプロジェクト名の配列
 * @return 読み込んだデータと操作函数
 */
export const useTaskCrawler = (projects: string[]): UseTaskCrawlerResult =>
  useSyncExternalStore(
    ...useMemo<
      Parameters<typeof useSyncExternalStore<UseTaskCrawlerResult>>
    >(() => {
      let result: UseTaskCrawlerResult = {
        tasks: [],
        errors: [],
        load: async () => {},
        loading: false,
      };
      let job = Promise.resolve();

      return [
        (flush) => {
          result.load = () => {
            job = (async () => {
              await job;
              result = { ...result, loading: true };
              flush();
              await check(projects, 60);
              result = { ...result, loading: false };
              flush();
            })();
            return job;
          };
          const update = () => {
            job = (async () => {
              await job;
              result = { ...result, loading: true };
              flush();
              const [tasks, errors] = makeTask(await loadLinks(projects));
              result = { ...result, tasks, errors, loading: false };
              flush();
            })();
          };

          update();
          return subscribe(projects, update);
        },
        () => result,
      ];
    }, projects),
  );

const makeTask = (Links: Iterable<Link>): [Task[], TaskError[]] => {
  const titleLcs = new Set<string>(); // 重複除外用
  const tasks: Task[] = [];
  const errors: TaskError[] = [];

  for (const { title, links, project } of Links) {
    for (const link of [title, ...links]) {
      // 重複除去
      const titleLc = toTitleLc(link);
      if (titleLcs.has(titleLc)) continue;
      titleLcs.add(titleLc);

      const result = parse(link);
      if (!result) continue;
      if (isErr(result)) {
        errors.push({ project, title: link, ...unwrapErr(result) });
        continue;
      }

      tasks.push({ project, title: link, ...unwrapOk(result) });
    }
  }

  return [tasks, errors];
};

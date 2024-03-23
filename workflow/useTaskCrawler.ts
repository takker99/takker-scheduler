import { useCallback, useEffect, useState } from "../deps/preact.tsx";
import {
  InvalidDateError,
  parse,
  Task as TaskBase,
  TaskRangeError,
} from "../howm/parse.ts";
import {
  check,
  decode,
  load as loadLinks,
  subscribe,
} from "../deps/storage.ts";
import { toTitleLc } from "../deps/scrapbox-std.ts";
import { Path } from "./path.ts";

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
export const useTaskCrawler = (projects: string[]): UseTaskCrawlerResult => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errors, setErrors] = useState<
    TaskError[]
  >([]);
  const [loading, setLoading] = useState(false);

  /** タスクを全て拾い上げる */
  const crawl = useCallback(async () => {
    const titleLcs = new Set<string>(); // 重複除外用

    setLoading(true);

    const result = await loadLinks(projects);
    const errors: TaskError[] = [];
    const tasks = result.flatMap(({ links, project }) =>
      links.flatMap((link) => {
        const { title } = decode(link);
        const result = parse(title);
        if (!result) return [];
        if (!result.ok) {
          errors.push({ project, title, ...result.value });
          return [];
        }

        // 重複除去
        const titleLc = toTitleLc(title);
        if (titleLcs.has(titleLc)) return [];
        titleLcs.add(titleLc);

        return [{ project, title, ...result.value }];
      })
    );
    setTasks(tasks);
    setErrors(errors);

    setLoading(false);
  }, [projects]);

  /** タスクデータをNetworkから読み込む */
  const load = useCallback(async () => {
    setLoading(true);
    await check(projects, 60);
    setLoading(false);
  }, [projects]);

  /** 更新があれば再読込する */
  useEffect(() => {
    crawl();
    return subscribe(projects, crawl);
  }, [projects, crawl]);

  return { tasks, errors, load, loading };
};

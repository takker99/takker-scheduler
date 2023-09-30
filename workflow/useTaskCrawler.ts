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

export type { InvalidDateError, TaskBase, TaskRangeError };
export interface Task extends TaskBase {
  project: string;
  title: string;
}

export type TaskError =
  & { project: string; title: string }
  & (InvalidDateError | TaskRangeError);

export interface UseTaskCrawler {
  tasks: Task[];
  errors: TaskError[];
  load: () => Promise<void>;
  loading: boolean;
}

export const useTaskCrawler = (projects: string[]): UseTaskCrawler => {
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

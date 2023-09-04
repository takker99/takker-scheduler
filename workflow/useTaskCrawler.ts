import { useCallback, useEffect, useState } from "../deps/preact.tsx";
import { parse, Task as TaskBase } from "./parse.ts";
import { Category, classify } from "./classify.ts";
import {
  check,
  decode,
  load as loadLinks,
  subscribe,
} from "../deps/storage.ts";
import { toTitleLc } from "../deps/scrapbox-std.ts";

export type { Category, TaskBase };
export interface Task extends TaskBase {
  project: string;
  title: string;
  category: Category;
}

export interface UseTaskCrawler {
  tasks: Task[];
  load: () => Promise<void>;
  loading: boolean;
}

export const useTaskCrawler = (projects: string[]): UseTaskCrawler => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  /** タスクを全て拾い上げる */
  const crawl = useCallback(async () => {
    setTasks([]);
    const titleLcs = new Set<string>(); // 重複除外用
    const now = new Date();

    setLoading(true);

    const result = await loadLinks(projects);
    const tasks = result.flatMap(({ links, project }) =>
      links.flatMap((link) => {
        const { title } = decode(link);
        const task = parse(title);
        if (!task) return [];

        // 重複除去
        const titleLc = toTitleLc(title);
        if (titleLcs.has(titleLc)) return [];
        titleLcs.add(titleLc);

        // 分別
        const category = classify(task, now);

        return [{ project, title, category, ...task }];
      })
    );
    setTasks((old) => [...old, ...tasks]);

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

  return { tasks, load, loading };
};

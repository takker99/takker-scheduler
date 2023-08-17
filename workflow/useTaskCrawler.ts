import { useCallback, useState } from "../deps/preact.tsx";
import type { Task as TaskBase } from "./parse.ts";
import { Category, classify } from "./classify.ts";
import { list } from "./list.ts";
import { sleep, toTitleLc } from "../deps/scrapbox-std.ts";

export type { Category, TaskBase };
export interface Task extends TaskBase {
  project: string;
  title: string;
  category: Category;
}
/** タスク収集の進捗表示用 */
export interface Progress {
  /** 収集処理の状態 */
  state: "loading" | "finished" | "neutral";
  /** 読み込むprojectの総数 */
  projectCount: number;
  /** 現在までに収集したタスクの総数 */
  taskCount: number;
}

export interface UseTaskCrawler {
  tasks: Task[];
  load: () => Promise<void>;
  progress: Progress;
}
export const useTaskCrawler = (projects: string[]): UseTaskCrawler => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<Progress>({
    state: "neutral",
    projectCount: 0,
    taskCount: 0,
  });
  const load = useCallback(async () => {
    setTasks([]);
    const titleLcs = new Set<string>(); // 重複除外用
    const now = new Date();

    setProgress({
      state: "loading",
      projectCount: projects.length,
      taskCount: titleLcs.size,
    });

    let animationId: number | undefined;
    let queue: Task[] = [];
    const promises = projects.map(async (project) => {
      for await (const { task, title } of list(project)) {
        // 重複除去
        const titleLc = toTitleLc(title);
        if (titleLcs.has(titleLc)) continue;
        titleLcs.add(titleLc);

        const category = classify(task, now);
        // 一旦貯める
        queue.push({
          project,
          title,
          category,
          ...task,
        });

        // 一定間隔ごとにデータを反映させる
        if (animationId !== undefined) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(() => {
          setTasks((tasks) => [...tasks, ...queue]);
          queue = [];
          setProgress({
            state: "loading",
            projectCount: projects.length,
            taskCount: titleLcs.size,
          });
          animationId = undefined;
        });
      }
    });

    await Promise.all(promises);
    // ↑の描画処理が全部終わるのを待つ
    // これがないと、↓の描画完了イベントが発行されない
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
    setProgress({
      state: "finished",
      projectCount: projects.length,
      taskCount: titleLcs.size,
    });
    await sleep(1000);
    setProgress({
      state: "neutral",
      projectCount: 0,
      taskCount: 0,
    });
  }, [projects.length]);

  return { tasks, load, progress };
};

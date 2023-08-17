import { getPage, readLinks } from "../deps/scrapbox-std.ts";
import { parse, Task } from "./parse.ts";
import type { Scrapbox } from "../deps/scrapbox-std-dom.ts";
declare const scrapbox: Scrapbox;

export async function* list(
  project: string,
): AsyncGenerator<{ task: Task; title: string }, void, unknown> {
  if (project === scrapbox.Project.name) {
    for (const { title } of scrapbox.Project.pages) {
      const task = parse(title);
      if (!task) continue;
      yield { task, title };
    }
    if (scrapbox.Page.title) {
      const result = await getPage(project, scrapbox.Page.title);
      if (!result.ok) return;
      const { links } = result.value;
      for (const title of links) {
        const task = parse(title);
        if (!task) continue;
        yield { task, title };
      }
    }
    return;
  }

  const titles = new Set<string>();
  const reader = await readLinks(project);
  if ("name" in reader) {
    const error = new Error();
    error.name = reader.name;
    error.message = reader.message;
    throw error;
  }

  for await (const page of reader) {
    for (const title of [page.title, ...page.links]) {
      if (titles.has(title)) continue;
      titles.add(title);

      const task = parse(title);
      if (!task) continue;
      yield { task, title };
    }
  }
}

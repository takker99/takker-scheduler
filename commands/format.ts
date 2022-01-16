import { format as formatPage } from "../diary.ts";
import { joinPageRoom } from "../deps/scrapbox.ts";

/** タスクページをformatする
 *
 * @param project formatしたいページのproject name
 * @param title formatしたいページのタイトル
 */
export async function format(project: string, title: string) {
  const { patch, cleanup } = await joinPageRoom(
    project,
    title,
  );
  await patch((lines) => formatPage(lines.map((line) => line.text)));
  cleanup();
}

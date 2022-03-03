import { format as formatPage } from "../diary.ts";
import { useStatusBar } from "../deps/scrapbox-std.ts";
import { patch } from "../deps/scrapbox-websocket.ts";

/** タスクページをformatする
 *
 * @param project formatしたいページのproject name
 * @param title formatしたいページのタイトル
 */
export async function format(
  project: string,
  title: string,
) {
  // 500ms以内に処理が終わらなければ、処理中メッセージを出す
  let remove: () => void = () => {};
  const timer = setTimeout(() => {
    const { render, dispose } = useStatusBar();
    remove = dispose;
    render({ type: "spinner" }, { type: "text", text: "formatting..." });
  }, 500);
  await patch(
    project,
    title,
    (lines) => formatPage(lines.map((line) => line.text)),
  );
  clearTimeout(timer);
  remove();
}

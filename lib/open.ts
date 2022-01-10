/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
import { encodeTitle } from "./utils.ts";

/** 同じタブでページを開く
 *
 * このとき、ページは再読み込みされない
 *
 * @param project 開くページのproject名
 * @param title 開くページのタイトル
 * @param [body] ページに追記するテキスト
 */
export function openInTheSameTab(
  project: string,
  title: string,
  body?: string,
) {
  const a = document.createElement("a");
  a.href = `../${project}/${encodeTitle(title)}${
    typeof body !== "string" ? "" : `?body=${encodeURIComponent(body)}`
  }`;
  document.body.append(a);
  a.click();
  a.remove();
}

import { isString } from "../utils.ts";

export function getIndentCount(
  text: string,
) {
  return text.match(/^(\s*)/)?.[1]?.length ?? 0;
}

/** 指定した行の配下にある行の数を返す
 *
 * @param index 指定したい行の行番号
 * @param lines 行のリスト
 */
export function getIndentLineCount(
  index: number,
  lines: string[] | { text: string }[],
) {
  const base = getIndentCount(getText(index, lines));
  let count = 0;
  while (
    index + count + 1 < lines.length &&
    (getIndentCount(getText(index + count + 1, lines))) > base
  ) {
    count++;
  }
  return count;
}

function getText(index: number, lines: string[] | { text: string }[]) {
  const line = lines[index];
  return isString(line) ? line : line.text;
}

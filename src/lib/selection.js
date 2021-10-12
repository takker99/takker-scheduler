import { position } from "./position.ts";
import { getDOMFromPoint, getIndex, getLineNo } from "./node.ts";
import { cursor, editor, selections, textInput } from "./dom.ts";

class Selection {
  constructor() {
    this._cursorObserver = undefined;
    // 先に.selectionの監視を開始する
    this._selectionObserver = new MutationObserver((mutations) => {
      if (
        mutations.flatMap((mutation) => [...mutation.addedNodes])
          .some((element) => element.classList.contains("selections"))
      ) {
        this._selectMode = true;
        this._recordSelectionEdge(); // 選択範囲の開始位置を記録しておく
      }
      if (
        mutations.flatMap((mutation) => [...mutation.removedNodes])
          .some((element) => element.classList.contains("selections"))
      ) {
        this._selectMode = false;
      }
    });
    this._selectionObserver.observe(editor(), { childList: true });
    this._cursorObserver = new MutationObserver((mutations) => {
      if (cursor().style.display === "none") return;
      const { char, line } = position();
      this._position = { index: getIndex(char), lineNo: getLineNo(line) };
    });
    this._cursorObserver.observe(cursor(), { attributes: true });
    this._recordedEdge = {};
  }

  // 選択範囲が存在するかどうか
  get exist() {
    return this.text !== "";
  }
  // 選択範囲の開始位置と終了位置を返す
  get range() {
    //if (!this.exist) return {message: '[range@scrapbox-selection-3] No range found.'};

    // 順番を判定する
    if (this._recordedEdge.lineNo > this._position.lineNo) {
      return {
        start: this._position,
        end: this._recordedEdge,
      };
    }
    if (this._recordedEdge.lineNo < this._position.lineNo) {
      return {
        start: this._recordedEdge,
        end: this._position,
      };
    }
    // 行が同じの場合は列で比較する
    if (this._recordedEdge.index > this._position.index) {
      return {
        start: this._position,
        end: this._recordedEdge,
      };
    }
    if (this._recordedEdge.index < this._position.index) {
      return {
        start: this._recordedEdge,
        end: this._position,
      };
    }
    // 完全に位置が一致している場合
    return {
      message:
        "[range@scrapbox-selection-3] the start position is the same as the end one.",
    };
  }

  get text() {
    if (!/mobile/i.test(navigator.userAgent)) {
      return textInput().value;
    }
    const range = selection.range;
    if (!range.start || !range.end) return "";
    const { start, end } = range;
    return [
      scrapbox.Page.lines[start.lineNo].text.substring(start.index),
      ...scrapbox.Page.lines.map((line) => line.text).slice(
        start.lineNo + 1,
        end.lineNo,
      ),
      scrapbox.Page.lines[end.lineNo].text.substring(0, end.index + 1),
    ].join("\n");
  }

  //cursorがない方の選択範囲の端を取得する
  // この関数を呼び出すタイミングではまだ_cursorObserverが呼び出されていないので、独自にcursorの位置を取得する
  _recordSelectionEdge() {
    if (!this.exist) return undefined;
    const selections = selections()?.getElementsByClassName(
      "selection",
    );

    // 一瞬で選択範囲が消えるとselectionsがundefindeになる場合がある
    if (!selections || selections?.length === 0) {
      this._selectMode = false;
      return undefined;
    }

    // 選択範囲の端の座標
    const startRect = selections[0].getBoundingClientRect();
    const endRect = (selections[2] ?? selections[0]).getBoundingClientRect();
    // 選択範囲の端の文字を取得する
    const start = getDOMFromPoint(startRect.left, startRect.top);
    const end = getDOMFromPoint(endRect.right, endRect.bottom);

    // 行数と列数を計算する
    const startEdge = {
      index: getIndex(start.char), // 末尾の場合はundefined
      lineNo: getLineNo(start.line),
    };
    const endEdge = {
      index: getIndex(end.char), // 末尾の場合はundefined
      lineNo: getLineNo(end.line),
    };

    // cursorの位置を取得する
    const temp = position();
    const cursorEdge = {
      index: getIndex(temp.char),
      lineNo: getLineNo(temp.line),
    };

    // 選択範囲が一行のときは、選択範囲の端の座標から計算した位置を使う
    // 1行かつ選択範囲の取得開始直後なら記法が展開されていることが保証されている
    if (startEdge.lineNo === endEdge.lineNo) {
      if (
        cursorEdge.index === startEdge.index &&
        cursorEdge.lineNo === startEdge.lineNo
      ) {
        this._recordedEdge = endEdge;
      } else {
        this._recordedEdge = startEdge;
      }
      return;
    }

    // 選択範囲が複数行に渡るときは、記録しておいたカーソルの位置を用いる
    // 記法が隠れている可能性があるので、選択範囲の座標から位置を計算できない
    this._recordedEdge = this._position;
  }
}

export const selection = new Selection();

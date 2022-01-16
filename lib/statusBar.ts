import { statusBar } from "./dom.ts";

/** .status-barの一区画を取得し、各種操作函数を返す */
export function useStatusBar() {
  const bar = statusBar();

  const item = document.createElement("div");
  bar.append(item);

  return {
    render: (...children: (string | Node)[]) => {
      item.textContent = "";
      item.append(...children);
    },
    dispose: () => item.remove(),
  };
}

/** スピナーを作る */
export function makeSpinner() {
  const span = document.createElement("span");
  span.classList.add("item");
  const i = document.createElement("i");
  i.classList.add("fa", "fa-spinner");
  span.append(i);
  return span;
}

/** チェックマークを作る */
export function makeCheckCircle() {
  const span = document.createElement("span");
  span.classList.add("item");
  const i = document.createElement("i");
  i.classList.add("kamon", "kamon-check-circle");
  span.append(i);
  return span;
}

/** 警告アイコンを作る */
export function makeExclamationTriangle() {
  const span = document.createElement("span");
  span.classList.add("item");
  const i = document.createElement("i");
  i.classList.add("fas", "fa-exclamation-triangle");
  span.append(i);
  return span;
}

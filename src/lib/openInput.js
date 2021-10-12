import { lightFormat, parse } from "../deps/date-fns.ts";

export const getValueFromInput = ({ type, value, x, y, max, min }) =>
  new Promise((resolve, reject) => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = type ?? "text";
    if (max) input.max = max;
    if (min) input.min = min;
    if (value) {
      input.value = type === "time"
        ? lightFormat(value, "HH:mm")
        : type === "date"
        ? lightFormat(value, "yyyy-MM-dd")
        : value;
    }
    const confirm = () => {
      // localeがおかしくなっている可能性があるので、文字列から変換する
      if (type === "time") {
        resolve(parse(input.value, "HH:mm", value));
      } else if (type === "date") {
        resolve(parse(input.value, "yyyy-MM-dd", value));
      } else if (type === "number") {
        resolve(input.valueAsNumber);
      } else {
        resolve(input.value);
      }
      input.remove();
    };
    input.addEventListener("blur", () => confirm());
    if (isMobile()) {
      input.addEventListener("change", () => confirm());
    } else {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        confirm();
      });
    }
    input.addEventListener("error", (e) => {
      reject(e);
    });

    input.style.position = "absolute";
    input.style.backgroundColor = "var(--page-bg)";
    const { top, left } = scrapboxDOM.editor.getBoundingClientRect();
    input.style.top = `${Math.round(y - top)}px`;
    input.style.left = `${Math.round(x - left)}px`;
    scrapboxDOM.editor.appendChild(input);
    input.focus();
  });

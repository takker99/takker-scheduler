import { textInput } from "./dom.ts";
export function insertText(text: string) {
  const cursor = textInput();
  if (!cursor) {
    throw Error("#text-input is not ditected.");
  }
  cursor.focus();
  cursor.value = text;

  const uiEvent = document.createEvent("UIEvent");
  uiEvent.initEvent("input", true, false);
  cursor.dispatchEvent(uiEvent);
  return Promise.resolve();
}

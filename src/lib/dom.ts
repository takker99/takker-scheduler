/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom" />
export const editor = () => document.getElementById("editor");
export const lines = () => document.getElementsByClassName("lines")?.[0];
export const computeLine = () => document.getElementById("compute-line");
export const cursorLine = () =>
  document.getElementsByClassName("cursor-line")?.[0];
export const textInput = () => {
  const textarea = document.getElementById("text-input");
  return textarea !== null ? textarea as HTMLTextAreaElement : null;
};
export const cursor = () => {
  const cursor = document.getElementsByClassName("cursor")?.[0];
  return cursor !== null ? cursor as HTMLTextAreaElement : null;
};
export const selections = () =>
  document.getElementsByClassName("selections")?.[0];
export const grid = () =>
  document.getElementsByClassName("related-page-list clearfix")?.[0]
    ?.getElementsByClassName("grid")?.[0];
export const popupMenu = () =>
  document.getElementsByClassName("popup-menu")?.[0];
export const pageMenu = () => document.getElementsByClassName("page-menu")?.[0];
export const pageInfoMenu = () => document.getElementById("page-info-menu");
export const pageEditMenu = () => document.getElementById("page-edit-menu");
export const pageEditButtons = () =>
  pageEditMenu()?.nextElementSibling?.getElementsByTagName("a");
export const randomJumpButton = () =>
  document.getElementsByClassName("random-jump-button")?.[0];
export const pageCustomButtons = () =>
  document.getElementsByClassName("page-menu-extension")?.[0];

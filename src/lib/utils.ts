export function toTitleLc(title: string) {
  return title.replaceAll(" ", "_").toLowerCase();
}

export function isLineId(id: string) {
  return /[a-f\d]{24}/.test(id);
}

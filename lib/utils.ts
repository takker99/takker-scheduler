export function toTitleLc(title: string) {
  return title.replaceAll(" ", "_").toLowerCase();
}
export function encodeTitle(title: string) {
  return title.replaceAll(" ", "_").replace(
    /[/?#\{}^|<>]/g,
    (char) => encodeURIComponent(char),
  );
}

export function isLineId(id: string) {
  return /[a-f\d]{24}/.test(id);
}

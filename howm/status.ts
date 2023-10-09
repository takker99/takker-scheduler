export type Status =
  | "todo"
  | "deadline"
  | "done"
  | "note"
  | "up-down";

export const toStatus = (symbol: string): Status | undefined => {
  switch (symbol) {
    case "+":
      return "todo";
    case "-":
      return "note";
    case "!":
      return "deadline";
    case ".":
      return "done";
    case "~":
      return "up-down";
    default:
      return;
  }
};
export const fromStatus = (
  status: Status,
): "+" | "-" | "!" | "." | "~" => {
  switch (status) {
    case "todo":
      return "+";
    case "note":
      return "-";
    case "deadline":
      return "!";
    case "done":
      return ".";
    case "up-down":
      return "~";
  }
};

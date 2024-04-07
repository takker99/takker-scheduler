import { Status } from "../../howm/status.ts";

export const toStatusLabel = (
  status: Status,
): "ToDo" | "覚書" | "締切" | "浮遊" | "完了" => {
  switch (status) {
    case "todo":
      return "ToDo";
    case "note":
      return "覚書";
    case "deadline":
      return "締切";
    case "up-down":
      return "浮遊";
    case "done":
      return "完了";
  }
};

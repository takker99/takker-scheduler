import { toStatusLabel } from "./toStatusLabel.ts";
import { assertEquals } from "../../deps/testing.ts";

Deno.test("toStatusLabel()", () => {
  assertEquals(toStatusLabel("todo"), "ToDo");
  assertEquals(toStatusLabel("note"), "覚書");
  assertEquals(toStatusLabel("deadline"), "締切");
  assertEquals(toStatusLabel("up-down"), "浮遊");
  assertEquals(toStatusLabel("done"), "完了");
});

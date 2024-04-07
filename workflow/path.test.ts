import { makeLink } from "./path.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("makeLink()", async (t) => {
  const base = "https://example.com";
  await t.step("with base URL", () => {
    const path = {
      project: "project-1",
      title: "task-1",
    };
    const expected = new URL("/project-1/task-1", base);
    assertEquals(makeLink(path, base), expected);
  });

  await t.step("multibyte characters", () => {
    const path = {
      project: "プロジェクト",
      title: "タスク",
    };
    const expected = new URL(
      "/プロジェクト/%E3%82%BF%E3%82%B9%E3%82%AF",
      base,
    );
    assertEquals(makeLink(path, base), expected);
  });
});

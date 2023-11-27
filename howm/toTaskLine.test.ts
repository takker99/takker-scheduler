/// <reference lib="deno.ns" />

import { toTaskLine } from "./toTaskLine.ts";
import { assertEquals } from "../deps/testing.ts";
import { parse, Task } from "../howm/parse.ts";
import { toString } from "../task.ts";

Deno.test("toTaskLine()", () => {
  assertEquals(
    toString(
      toTaskLine(
        parse("ごはんを食べる+3@2023-04-13/23T05:47D45")!.value as Task,
      ),
    ),
    "`2023-04-13                             `[+3@2023-04-13ごはんを食べるD45]",
  );
  assertEquals(
    toString(
      toTaskLine(parse("ごはんを食べる@2023-04-13T05:47D45")!.value as Task),
    ),
    "`2023-04-13 05:47 0045                  `ごはんを食べる",
  );
});

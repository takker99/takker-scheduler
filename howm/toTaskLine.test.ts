import { toTaskLine } from "./toTaskLine.ts";
import { assertEquals } from "../deps/testing.ts";
import { parse } from "../howm/parse.ts";
import { toString } from "../task.ts";
import { unwrapOk } from "../deps/option-t.ts";

Deno.test("toTaskLine()", () => {
  assertEquals(
    toString(
      toTaskLine(
        unwrapOk(parse("ごはんを食べる+3@2023-04-13/23T05:47D45")!),
        new Date(),
      )!,
    ),
    "`2023-04-13                             `[ごはんを食べる+3@2023-04-13/23T05:47D45]",
  );
  assertEquals(
    toString(
      toTaskLine(
        unwrapOk(parse("ごはんを食べる@2023-04-13T05:47D45")!),
        new Date(),
      )!,
    ),
    "`2023-04-13 05:47 0045                  `[ごはんを食べる@2023-04-13T05:47D45]",
  );
  assertEquals(
    toString(
      toTaskLine(
        unwrapOk(parse("ごはんを食べる@2023-04-13T05:47D45R1")!),
        new Date(2023, 3, 14),
      )!,
    ),
    "`2023-04-14 05:47 0045                  `ごはんを食べる",
  );
  assertEquals(
    toTaskLine(
      unwrapOk(parse("爪切り+@2023-10-09T12:00D5RW1")!),
      new Date(2023, 9, 15),
    ),
    undefined,
  );
  assertEquals(
    toString(
      toTaskLine(
        unwrapOk(parse("爪切り+@2023-10-09T12:00D5RW1")!),
        new Date(2023, 9, 16),
      )!,
    ),
    "`2023-10-16 12:00 0005                  `[+@2023-10-16T12:00D5爪切り]",
  );
});

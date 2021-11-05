import { isTask, parse, Task, toString } from "./task.ts";
import { assert, assertEquals } from "./deps/testing.ts";

const testData: [string, Task][] = [
  [
    "`2021-09-23                             `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {},
    },
  ],
  [
    "`2021-09-23 21:56                       `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: { start: new Date(2021, 8, 23, 21, 56) },
      record: {},
    },
  ],
  [
    "`2021-09-23 21:56 0010                  `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        start: new Date(2021, 8, 23, 21, 56),
        duration: 600,
      },
      record: {},
    },
  ],
  [
    "`2021-09-23       0010                  `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: { duration: 600 },
      record: {},
    },
  ],
  [
    "`2021-09-23 12:00 0010 12:08:27 12:11:52`sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        start: new Date(2021, 8, 23, 12),
        duration: 600,
      },
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
        end: new Date(2021, 8, 23, 12, 11, 52),
      },
    },
  ],
  [
    "`2021-09-23            12:08:27 12:11:52`sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
        end: new Date(2021, 8, 23, 12, 11, 52),
      },
    },
  ],
  [
    "`2021-09-23            22:08:27 01:11:52`sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 22, 8, 27),
        end: new Date(2021, 8, 24, 1, 11, 52),
      },
    },
  ],
];

Deno.test("check RegExp", () =>
  testData.forEach(([text]) => assert(isTask(text))));
Deno.test("parse()", () =>
  testData.forEach(([text, task]) => assertEquals(parse(text), task)));
Deno.test("toString()", () =>
  testData.forEach(([text, task]) => assertEquals(toString(task), text)));

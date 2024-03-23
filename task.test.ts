import {
  isDone,
  isRunning,
  isTask,
  parse,
  parseBlock,
  Task,
  toString,
} from "./task.ts";
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
    "`2021-09-23 12:00      12:08:27 12:11:52`sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        start: new Date(2021, 8, 23, 12),
      },
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
        end: new Date(2021, 8, 23, 12, 11, 52),
      },
    },
  ],
  [
    "`2021-09-23       0010 12:08:27 12:11:52`sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
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
    "`2021-09-23 12:00 0010 12:08:27         `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        start: new Date(2021, 8, 23, 12),
        duration: 600,
      },
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
      },
    },
  ],
  [
    "`2021-09-23 12:00      12:08:27         `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        start: new Date(2021, 8, 23, 12),
      },
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
      },
    },
  ],
  [
    "`2021-09-23       0010 12:08:27         `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {
        duration: 600,
      },
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
      },
    },
  ],
  [
    "`2021-09-23            22:08:27         `sample task",
    {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 22, 8, 27),
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
Deno.test("parseBlock()", () => {
  const lines = [
    "title",
    testData[0][0],
    "no indent line",
    " indent line",
    testData[1][0],
    " indent line",
    "  indent line",
    testData[2][0],
    "  indent line",
    "  indent line",
    testData[3][0],
    " indent line",
    "  indent line",
    "",
    " indent line",
    testData[4][0],
    "",
    " indent line",
    testData[5][0],
    " indent line",
    "  indent line",
    " indent line",
    "  indent line",
    "  indent line",
    "",
    "no indent line",
  ];
  const tasks = [...parseBlock(lines)];
  assertEquals(tasks[0], { ...testData[0][1], lines: [] });
  assertEquals(tasks[1], {
    ...testData[1][1],
    lines: [
      " indent line",
      "  indent line",
    ],
  });
  assertEquals(tasks[2], {
    ...testData[2][1],
    lines: [
      "  indent line",
      "  indent line",
    ],
  });
  assertEquals(tasks[3], {
    ...testData[3][1],
    lines: [
      " indent line",
      "  indent line",
    ],
  });
  assertEquals(tasks[4], { ...testData[4][1], lines: [] });
  assertEquals(tasks[5], {
    ...testData[5][1],
    lines: [
      " indent line",
      "  indent line",
      " indent line",
      "  indent line",
      "  indent line",
    ],
  });
});
Deno.test("isRunning()", async (t) => {
  await t.step("should return true if task is running", () => {
    const task: Task = {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
      },
    };
    const result = isRunning(task);
    assertEquals(result, true);
  });

  await t.step("should return false if task is not running", () => {
    const task: Task = {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
        end: new Date(2021, 8, 23, 12, 11, 52),
      },
    };
    const result = isRunning(task);
    assertEquals(result, false);
  });
});

Deno.test("isDone()", async (t) => {
  await t.step("should return true if task is done", () => {
    const task: Task = {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
        end: new Date(2021, 8, 23, 12, 11, 52),
      },
    };
    const result = isDone(task);
    assertEquals(result, true);
  });
  await t.step("should return false if task is not done", () => {
    const task: Task = {
      title: "sample task",
      base: new Date(2021, 8, 23),
      plan: {},
      record: {
        start: new Date(2021, 8, 23, 12, 8, 27),
      },
    };
    const result = isDone(task);
    assertEquals(result, false);
  });
});

import { template } from "./template.ts";
import { assertEquals } from "../deps/testing.ts";

Deno.test("template()", () => {
  const date = new Date("2023-04-13T05:47:00");
  const inputTemplate = [
    "Today is @yyyy-MM-dd@",
    "Tomorrow is @yyyy-MM-dd+1@",
    "Yesterday was @yyyy-MM-dd-1@",
    "Next week is @yyyy-MM-dd+1w@",
    "Previous week was @yyyy-MM-dd-1w@",
    "20 days ago was @yyyy-MM-dd-20@",
    "This week is @yyyy-ww@",
    "Next week is @yyyy-ww+1@",
    "Previous week was @yyyy-ww-1@",
  ];
  const expectedOutput = [
    "Today is 2023-04-13",
    "Tomorrow is 2023-04-14",
    "Yesterday was 2023-04-12",
    "Next week is 2023-04-20",
    "Previous week was 2023-04-06",
    "20 days ago was 2023-03-24",
    "This week is 2023-w15",
    "Next week is 2023-w16",
    "Previous week was 2023-w14",
  ];

  assertEquals(template(date, inputTemplate), expectedOutput);
});

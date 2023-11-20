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
    "Next week is @yyyy-ww+1w@",
    "Previous week was @yyyy-ww-1w@",
    "This week list:",
    "- @yyyy-MM-dd(Sun)@",
    "- @yyyy-MM-dd(Mon)@",
    "- @yyyy-MM-dd(Tue)@",
    "- @yyyy-MM-dd(Wed)@",
    "- @yyyy-MM-dd(Thu)@",
    "- @yyyy-MM-dd(Fri)@",
    "- @yyyy-MM-dd(Sat)@",
    "2 weeks ago week list:",
    "- @yyyy-MM-dd-2w(Sun)@",
    "- @yyyy-MM-dd-2w(Mon)@",
    "- @yyyy-MM-dd-2w(Tue)@",
    "- @yyyy-MM-dd-2w(Wed)@",
    "- @yyyy-MM-dd-2w(Thu)@",
    "- @yyyy-MM-dd-2w(Fri)@",
    "- @yyyy-MM-dd-2w(Sat)@",
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
    "This week list:",
    "- 2023-04-09",
    "- 2023-04-10",
    "- 2023-04-11",
    "- 2023-04-12",
    "- 2023-04-13",
    "- 2023-04-14",
    "- 2023-04-15",
    "2 weeks ago week list:",
    "- 2023-03-26",
    "- 2023-03-27",
    "- 2023-03-28",
    "- 2023-03-29",
    "- 2023-03-30",
    "- 2023-03-31",
    "- 2023-04-01",
  ];

  assertEquals(template(date, inputTemplate), expectedOutput);
});

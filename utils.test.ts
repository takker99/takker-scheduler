/// <reference lib="deno.unstable" />
import { ensureArray, isNumber, isString, oneByOne } from "./utils.ts";
import { sleep } from "./lib/sleep.ts";
import { assertEquals, assertThrows } from "./deps/testing.ts";

Deno.test("ensureArray()", async ({ step }) => {
  // ported from https://github.com/lambdalisue/deno-unknownutil/blob/bb05a449578707fde3f26a92973d3ab0a5cdc101/ensure_test.ts#L70
  await step("does nothing on array", () => {
    ensureArray([]);
    ensureArray([0, 1, 2]);
    ensureArray(["a", "b", "c"]);
  });
  await step("throws error on non array", () => {
    assertThrows(() => ensureArray("a"));
    assertThrows(() => ensureArray(0));
    assertThrows(() => ensureArray(true));
    assertThrows(() => ensureArray(false));
    assertThrows(() => ensureArray({}));
    assertThrows(() => ensureArray(function () {}));
    assertThrows(() => ensureArray(undefined));
    assertThrows(() => ensureArray(null));
  });
  await step("does nothing on T array", () => {
    ensureArray([0, 1, 2], isNumber);
    ensureArray(["a", "b", "c"], isString);
  });
  await step("throws error on non T array", () => {
    assertThrows(() => ensureArray([0, 1, 2], isString));
    assertThrows(() => ensureArray(["a", "b", "c"], isNumber));
    assertThrows(() => ensureArray([true, false, true], isString));
  });
});

Deno.test("oneByOne()", async () => {
  const delay = async (i: number, j: number) => {
    await sleep(j);
    return i;
  };

  const pendings = [
    delay(0, 500),
    delay(1, 1000),
    delay(2, 800),
  ];
  const results = [] as number[];
  for await (const result of oneByOne(pendings)) {
    if (result.state === "rejected") continue;
    results.push(result.value);
  }
  assertEquals(results, [0, 2, 1]);
});

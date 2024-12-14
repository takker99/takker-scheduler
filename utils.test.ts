import { oneByOne } from "./utils.ts";
import { delay as sleep } from "./deps/async.ts";
import { assertEquals } from "./deps/testing.ts";

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

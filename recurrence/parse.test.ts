/// <reference lib="deno.ns" />

import { parse } from "./parse.ts";
import { assertSnapshot } from "../deps/testing.ts";

Deno.test("parse()", async (t) => {
    const args = [
      "ごはんを食べる+3@2023-*-30T12:30D45",
      "ごはんを食べる+3@2023-*-*T12:30D45",
      "ごはんを食べる+3@*-*-*T12:30D45",
      "ごはんを食べる+3@*-*-SunT12:30D45",
      "ごはんを食べる+3@*-*-MonT12:30D45",
      "ごはんを食べる+3@*-*-TueT12:30D45",
      "ごはんを食べる+3@*-*-WedT12:30D45",
      "ごはんを食べる+3@*-*-ThuT12:30D45",
      "ごはんを食べる+3@*-*-FriT12:30D45",
      "ごはんを食べる+3@*-*-SatT12:30D45",
      "ごはんを食べる@*-*-*T12:30D45",
      "ごはんを食べる@2023-12-11T12:30D45",
    ];
    for (const arg of args) {
      await t.step(arg, () => assertSnapshot(t, parse(arg)));
    }
});

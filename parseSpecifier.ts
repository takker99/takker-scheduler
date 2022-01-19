import type { DateValues, Duration } from "./deps/date-fns.ts";
import { add, set } from "./deps/date-fns.ts";
import { calcStart } from "./commands/calcStart.ts";

export function parseSpecifier(
  text: string,
  base: Date,
): Date | undefined {
  for (const { test, parse } of parsers) {
    const matches = text.match(test);
    if (!matches) continue;

    const data = parse(matches);
    const date = data.isDuration ? add(base, data) : set(base, data);
    if (data.type === "start") {
      return date;
    }
    return calcStart(
      base.getTime() / 1000,
      date.getTime() / (24 * 60 * 60 * 1000),
    );
  }
}

interface Parser {
  test: RegExp;
  parse: (
    match: RegExpMatchArray,
  ) =>
    & { type: "start" | "end" }
    & (
      | ({ isDuration: false } & DateValues)
      | ({ isDuration: true } & Duration)
    );
}
const parsers: Parser[] = [
  {
    test: /(s|e):(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        date: parseInt(match[4]),
        hours: parseInt(match[5]),
        minutes: parseInt(match[6]),
      };
    },
  },
  {
    test: /(s|e):(\d{4})-(\d{2})-(\d{2})T(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        date: parseInt(match[4]),
        hours: parseInt(match[5]),
      };
    },
  },
  {
    test: /(s|e):(\d{4})-(\d{2})-(\d{2})T?\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        date: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):(\d{2})-(\d{2})T(\d{2}):(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
        hours: parseInt(match[4]),
        minutes: parseInt(match[5]),
      };
    },
  },
  {
    test: /(s|e):(\d{2})-(\d{2})T(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
        hours: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):(\d{2})-(\d{2})T?\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):(\d{2})T(\d{2}):(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        date: parseInt(match[2]),
        hours: parseInt(match[3]),
        minutes: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):(\d{2})T(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        date: parseInt(match[2]),
        hours: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):T?(\d{2}):(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        hours: parseInt(match[2]),
        minutes: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):T?(\d{2})\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: false,
        hours: parseInt(match[2]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)Y(\d+)M(\d+)DT(\d+)H(\d+)M\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        days: parseInt(match[4]),
        hours: parseInt(match[5]),
        minutes: parseInt(match[6]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)Y(\d+)M(\d+)DT(\d+)H\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        days: parseInt(match[4]),
        hours: parseInt(match[5]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)Y(\d+)M(\d+)D\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        year: parseInt(match[2]),
        month: parseInt(match[3]) - 1,
        days: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)M(\d+)DT(\d+)H(\d+)M\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
        hours: parseInt(match[4]),
        minutes: parseInt(match[5]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)M(\d+)DT(\d+)H\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
        hours: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)M(\d+)D\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)DT(\d+)H(\d+)M\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        days: parseInt(match[2]),
        hours: parseInt(match[3]),
        minutes: parseInt(match[4]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)DT(\d+)H\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        days: parseInt(match[2]),
        hours: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)D\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        days: parseInt(match[2]),
      };
    },
  },
  {
    test: /(s|e):PT?(\d+)H(\d+)M\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        hours: parseInt(match[2]),
        minutes: parseInt(match[3]),
      };
    },
  },
  {
    test: /(s|e):PT?(\d+)H\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        hours: parseInt(match[2]),
      };
    },
  },
  {
    test: /(s|e):PT?(\d+)M\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        minutes: parseInt(match[2]),
      };
    },
  },
  {
    test: /(s|e):P(\d+)W\s*$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        type: match[1] === "s" ? "start" : "end",
        isDuration: true,
        weeks: parseInt(match[2]),
      };
    },
  },
];

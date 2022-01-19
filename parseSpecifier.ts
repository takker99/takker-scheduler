import type { DateValues, Duration } from "./deps/date-fns.ts";
import { add, set } from "./deps/date-fns.ts";
import { calcStart } from "./calcStart.ts";

export function parseSpecifier(
  text: string,
  base: Date,
): [string, Date] | undefined {
  const parts = text.match(/^(.*?)(s|e):([^\s]+)/);
  if (!parts) return;
  const [, name, type, param] = parts;

  for (const { test, parse } of parsers) {
    const matches = param.match(test);
    if (!matches) continue;

    const data = parse(matches);
    const date = data.isDuration ? add(base, data) : set(base, data);
    if (type === "s") {
      return [name.trimEnd(), date];
    }
    return [
      name.trimEnd(),
      calcStart(
        base.getTime() / 1000,
        date.getTime() / (24 * 60 * 60 * 1000),
      ),
    ];
  }
}

interface Parser {
  test: RegExp;
  parse: (
    match: RegExpMatchArray,
  ) => (
    | ({ isDuration: false } & DateValues)
    | ({ isDuration: true } & Duration)
  );
}
const parsers: Parser[] = [
  {
    test: /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
        hours: parseInt(match[4]),
        minutes: parseInt(match[5]),
      };
    },
  },
  {
    test: /(\d{4})-(\d{2})-(\d{2})T(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
        hours: parseInt(match[4]),
      };
    },
  },
  {
    test: /(\d{4})-(\d{2})-(\d{2})T?$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        date: parseInt(match[3]),
      };
    },
  },
  {
    test: /(\d{2})-(\d{2})T(\d{2}):(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        month: parseInt(match[1]) - 1,
        date: parseInt(match[2]),
        hours: parseInt(match[3]),
        minutes: parseInt(match[4]),
      };
    },
  },
  {
    test: /(\d{2})-(\d{2})T(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        month: parseInt(match[1]) - 1,
        date: parseInt(match[2]),
        hours: parseInt(match[3]),
      };
    },
  },
  {
    test: /(\d{2})-(\d{2})T?$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        month: parseInt(match[1]) - 1,
        date: parseInt(match[2]),
      };
    },
  },
  {
    test: /(\d{2})T(\d{2}):(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        date: parseInt(match[1]),
        hours: parseInt(match[2]),
        minutes: parseInt(match[3]),
      };
    },
  },
  {
    test: /(\d{2})T(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        date: parseInt(match[1]),
        hours: parseInt(match[2]),
      };
    },
  },
  {
    test: /T?(\d{2}):(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
      };
    },
  },
  {
    test: /T?(\d{2})$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: false,
        hours: parseInt(match[1]),
      };
    },
  },
  {
    test: /P(\d+)Y(\d+)M(\d+)DT(\d+)H(\d+)M$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
        hours: parseInt(match[4]),
        minutes: parseInt(match[5]),
      };
    },
  },
  {
    test: /P(\d+)Y(\d+)M(\d+)DT(\d+)H$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
        hours: parseInt(match[4]),
      };
    },
  },
  {
    test: /P(\d+)Y(\d+)M(\d+)D$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        year: parseInt(match[1]),
        month: parseInt(match[2]) - 1,
        days: parseInt(match[3]),
      };
    },
  },
  {
    test: /P(\d+)M(\d+)DT(\d+)H(\d+)M$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        month: parseInt(match[1]) - 1,
        days: parseInt(match[2]),
        hours: parseInt(match[3]),
        minutes: parseInt(match[4]),
      };
    },
  },
  {
    test: /P(\d+)M(\d+)DT(\d+)H$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        month: parseInt(match[1]) - 1,
        days: parseInt(match[2]),
        hours: parseInt(match[3]),
      };
    },
  },
  {
    test: /P(\d+)M(\d+)D$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        month: parseInt(match[1]) - 1,
        days: parseInt(match[2]),
      };
    },
  },
  {
    test: /P(\d+)DT(\d+)H(\d+)M$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        days: parseInt(match[1]),
        hours: parseInt(match[2]),
        minutes: parseInt(match[3]),
      };
    },
  },
  {
    test: /P(\d+)DT(\d+)H$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        days: parseInt(match[1]),
        hours: parseInt(match[2]),
      };
    },
  },
  {
    test: /P(\d+)D$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        days: parseInt(match[1]),
      };
    },
  },
  {
    test: /PT?(\d+)H(\d+)M$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        hours: parseInt(match[1]),
        minutes: parseInt(match[2]),
      };
    },
  },
  {
    test: /PT?(\d+)H$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        hours: parseInt(match[1]),
      };
    },
  },
  {
    test: /PT?(\d+)M$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        minutes: parseInt(match[1]),
      };
    },
  },
  {
    test: /P(\d+)W$/i,
    parse: (match: RegExpMatchArray) => {
      return {
        isDuration: true,
        weeks: parseInt(match[1]),
      };
    },
  },
];

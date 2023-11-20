import {
  addDays,
  getWeek,
  getYear,
  lightFormat,
  startOfWeek,
  subDays,
} from "../deps/date-fns.ts";

/**
 * Replaces placeholders in the template with formatted date values.
 *
 * @param date - The date to be used for replacement.
 * @param template - The template containing placeholders to be replaced.
 * @returns An array of strings with the replaced values.
 */
export const template = (date: Date, template: string[]): string[] =>
  template.map((line) =>
    line.replace(
      /@yyyy-MM-dd HH:mm:ss@/g,
      lightFormat(date, "yyyy-MM-dd HH:mm:ss"),
    )
      .replace(/@yyyy-MM-dd@/g, lightFormat(date, "yyyy-MM-dd"))
      .replace(
        /@yyyy-MM-dd(?:([+-])(\d+)(w?))?(?:\((Sun|Mon|Tue|Wed|Thu|Fri|Sat)\))?@/g,
        (_, pm, days, isWeek, day) => {
          const newDate = !pm
            ? date
            : pm === "+"
            ? addDays(date, parseInt(days) * (isWeek === "w" ? 7 : 1))
            : subDays(date, parseInt(days) * (isWeek === "w" ? 7 : 1));
          return lightFormat(
            !day ? newDate : addDays(startOfWeek(newDate), dayToNumber(day)),
            "yyyy-MM-dd",
          );
        },
      )
      .replace(
        /@yyyy-ww@/g,
        `${getYear(date)}-w${`${getWeek(date)}`.padStart(2, "0")}`,
      )
      .replace(
        /@yyyy-ww([+-])(\d+)(w?)@/g,
        (_, pm, weeks, isWeek) => {
          const newDate = pm === "+"
            ? addDays(date, parseInt(weeks) * (isWeek === "w" ? 7 : 1))
            : subDays(date, parseInt(weeks) * (isWeek === "w" ? 7 : 1));
          return `${getYear(newDate)}-w${
            `${getWeek(newDate)}`.padStart(2, "0")
          }`;
        },
      )
  );

const dayToNumber = (day: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 => {
  switch (day) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    default:
      return 6;
  }
};

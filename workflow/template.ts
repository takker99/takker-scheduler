import {
  addDays,
  getWeek,
  getYear,
  lightFormat,
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
        /@yyyy-MM-dd([+-])(\d+)(w?)@/g,
        (_, pm, days, isWeek) =>
          lightFormat(
            pm === "+"
              ? addDays(date, parseInt(days) * (isWeek === "w" ? 7 : 1))
              : subDays(date, parseInt(days) * (isWeek === "w" ? 7 : 1)),
            "yyyy-MM-dd",
          ),
      )
      .replace(
        /@yyyy-ww@/g,
        `${getYear(date)}-w${`${getWeek(date)}`.padStart(2, "0")}`,
      )
      .replace(
        /@yyyy-ww([+-])(\d+)@/g,
        (_, pm, weeks) => {
          const newDate = pm === "+"
            ? addDays(date, parseInt(weeks) * 7)
            : subDays(date, parseInt(weeks) * 7);
          return `${getYear(newDate)}-w${
            `${getWeek(newDate)}`.padStart(2, "0")
          }`;
        },
      )
  );

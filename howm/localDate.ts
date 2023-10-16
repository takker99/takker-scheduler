export interface LocalDate {
  year: number;
  month: number;
  date: number;
}
export interface LocalDateTime extends LocalDate {
  hours: number;
  minutes: number;
}

export const isLocalDateTime = (
  date: LocalDate | LocalDateTime,
): date is LocalDateTime => "hours" in date;

export const isBefore = (
  first: LocalDate | LocalDateTime,
  second: LocalDate | LocalDateTime,
): boolean =>
  first.year !== second.year
    ? first.year < second.year
    : first.month !== second.month
    ? first.month < second.month
    : first.date !== second.date
    ? first.date < second.date
    : "hours" in second
    ? "hours" in first
      ? first.hours * 60 + first.minutes < second.hours * 60 + second.minutes
      : 0 < second.hours * 60 + second.minutes
    : false;

export const format = (date: LocalDate | LocalDateTime): string =>
  `${`${date.year}`.padStart(4, "0")}-${zero(date.month)}-${zero(date.date)}${
    "hours" in date ? `T${zero(date.hours)}:${zero(date.minutes)}` : ""
  }`;

const zero = (n: number): string => `${n}`.padStart(2, "0");

export const toDate = (date: LocalDate | LocalDateTime): Date => {
  const str = format(date);
  return new Date(str.includes("T") ? str : `${str}T00:00`);
};

export const fromDate = (date: Date): LocalDateTime => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  date: date.getDate(),
  hours: date.getHours(),
  minutes: date.getMinutes(),
});

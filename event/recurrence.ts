export interface Recurrence {
  frequency: Frequency;
  count: number;
}

export type Frequency = "yearly" | "monthly" | "weekly" | "daily";

export const toFrequency = (
  symbol: string,
): Frequency | undefined => {
  switch (symbol.toLowerCase()) {
    case "y":
      return "yearly";
    case "m":
      return "monthly";
    case "w":
      return "weekly";
    case "d":
      return "daily";
    default:
      return;
  }
};

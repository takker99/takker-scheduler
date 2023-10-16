import { useEffect, useState } from "../deps/preact.tsx";
/** 1分ごとにDateを生成して返すhooks */
export const useMinutes = (): Date => {
  const [date, setDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000 * 60);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return date;
};

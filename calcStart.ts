/** 開始日時を計算する
 *
 * @param happen タスクが発生した日時のUNIX時刻
 * @param duration 発生から何日目までを締め切りとするか
 * @return 開始日時
 */
export const calcStart = (happen: number, duration = 7): Date =>
  new Date(
    (
      happen +
      (24 * 60 * 60 * 30 * ((duration + 1) ** 1.5 - 1)) / ((300 + 1) ** 1.5 - 1)
    ) * 1000,
  );

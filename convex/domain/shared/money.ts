import { ConvexError } from "convex/values";

/**
 * 金額関連のユーティリティ
 *
 * 金額は常に整数（円単位）で扱う。
 * 小数点以下は扱わない（日本円前提）。
 */

/**
 * 金額を均等に分割し、端数を処理する
 *
 * @param amount 総額
 * @param count 分割数
 * @returns [基本額, 端数]
 *
 * @example
 * divideWithRemainder(1000, 3) // => [333, 1]
 * divideWithRemainder(900, 3)  // => [300, 0]
 */
export function divideWithRemainder(
  amount: number,
  count: number,
): [base: number, remainder: number] {
  if (count <= 0) {
    throw new ConvexError("分割数は1以上である必要があります");
  }
  const base = Math.floor(amount / count);
  const remainder = amount % count;
  return [base, remainder];
}

/**
 * 金額の合計を計算
 *
 * @param amounts 金額の配列
 * @returns 合計額
 */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * 金額が有効な範囲内かチェック
 *
 * @param amount 金額
 * @param min 最小値
 * @param max 最大値
 * @returns 有効な場合true
 */
export function isValidAmount(
  amount: number,
  min: number,
  max: number,
): boolean {
  return Number.isInteger(amount) && amount >= min && amount <= max;
}

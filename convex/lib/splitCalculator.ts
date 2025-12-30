import type { Id } from "../_generated/dataModel";

/**
 * 負担配分の計算結果
 */
export interface SplitResult {
  userId: Id<"users">;
  amount: number;
}

/**
 * 均等分割（端数は支払者が負担）
 *
 * @param amount 支出金額（整数）
 * @param memberIds 負担するメンバーのIDリスト
 * @param payerId 支払者のID（端数を負担）
 * @returns 各メンバーの負担額
 *
 * @example
 * // 1000円を3人で均等分割（Aが支払い）
 * calculateEqualSplit(1000, [A, B, C], A)
 * // => [{ userId: A, amount: 334 }, { userId: B, amount: 333 }, { userId: C, amount: 333 }]
 */
export function calculateEqualSplit(
  amount: number,
  memberIds: Id<"users">[],
  payerId: Id<"users">,
): SplitResult[] {
  if (memberIds.length === 0) {
    throw new Error("メンバーが指定されていません");
  }

  if (amount <= 0) {
    throw new Error("金額は1円以上である必要があります");
  }

  const count = memberIds.length;
  const base = Math.floor(amount / count);
  const remainder = amount % count;

  return memberIds.map((userId) => ({
    userId,
    // 支払者が端数を負担
    amount: userId === payerId ? base + remainder : base,
  }));
}

import { ConvexError } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { SplitResult, RatioSplitInput, AmountSplitInput } from "./types";

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
    throw new ConvexError("メンバーが指定されていません");
  }

  if (amount <= 0) {
    throw new ConvexError("金額は1円以上である必要があります");
  }

  const count = memberIds.length;
  const base = Math.floor(amount / count);
  const remainder = amount % count;

  return memberIds.map((userId) => ({
    userId,
    amount: userId === payerId ? base + remainder : base,
  }));
}

/**
 * 割合分割（端数は支払者が負担）
 */
export function calculateRatioSplit(
  amount: number,
  ratios: RatioSplitInput[],
  payerId: Id<"users">,
): SplitResult[] {
  if (ratios.length === 0) {
    throw new ConvexError("割合が指定されていません");
  }

  if (amount <= 0) {
    throw new ConvexError("金額は1円以上である必要があります");
  }

  const totalRatio = ratios.reduce((sum, r) => sum + r.ratio, 0);
  if (totalRatio !== 100) {
    throw new ConvexError("割合の合計は100%である必要があります");
  }

  const results: SplitResult[] = ratios.map((r) => ({
    userId: r.userId,
    amount: Math.floor((amount * r.ratio) / 100),
  }));

  const totalCalculated = results.reduce((sum, r) => sum + r.amount, 0);
  const remainder = amount - totalCalculated;

  if (remainder > 0) {
    const payerResult = results.find((r) => r.userId === payerId);
    if (payerResult) {
      payerResult.amount += remainder;
    } else {
      results[0].amount += remainder;
    }
  }

  return results;
}

/**
 * 金額指定分割（入力値をそのまま使用）
 */
export function calculateAmountSplit(
  amounts: AmountSplitInput[],
): SplitResult[] {
  if (amounts.length === 0) {
    throw new ConvexError("金額が指定されていません");
  }

  return amounts.map((a) => ({
    userId: a.userId,
    amount: a.amount,
  }));
}

/**
 * 全額負担（1人が全額、他は0）
 */
export function calculateFullSplit(
  amount: number,
  memberIds: Id<"users">[],
  bearerId: Id<"users">,
): SplitResult[] {
  if (memberIds.length === 0) {
    throw new ConvexError("メンバーが指定されていません");
  }

  if (amount <= 0) {
    throw new ConvexError("金額は1円以上である必要があります");
  }

  if (!memberIds.includes(bearerId)) {
    throw new ConvexError("負担者はメンバーに含まれている必要があります");
  }

  return memberIds.map((userId) => ({
    userId,
    amount: userId === bearerId ? amount : 0,
  }));
}

import type { Id } from "../../_generated/dataModel";
import {
  EXPENSE_RULES,
  type ExpenseInput,
  type SplitDetails,
  type RatioSplitInput,
  type AmountSplitInput,
} from "./types";

/**
 * バリデーションエラー
 */
export class ExpenseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseValidationError";
  }
}

/**
 * 金額のバリデーション
 *
 * @throws {ExpenseValidationError} 金額が不正な場合
 */
export function validateAmount(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new ExpenseValidationError("金額は整数で入力してください");
  }
  if (amount < EXPENSE_RULES.MIN_AMOUNT || amount > EXPENSE_RULES.MAX_AMOUNT) {
    throw new ExpenseValidationError(
      "金額は0円から1億円の範囲で入力してください",
    );
  }
}

/**
 * 日付のバリデーション
 *
 * @throws {ExpenseValidationError} 日付形式が不正な場合
 */
export function validateDate(date: string): void {
  if (!EXPENSE_RULES.DATE_FORMAT_REGEX.test(date)) {
    throw new ExpenseValidationError("日付の形式が正しくありません");
  }
}

/**
 * タイトルのバリデーション
 *
 * @param title 入力タイトル
 * @returns バリデーション済みタイトル（空文字はundefined）
 * @throws {ExpenseValidationError} タイトルが長すぎる場合
 */
export function validateTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const trimmed = title.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > EXPENSE_RULES.MAX_TITLE_LENGTH) {
    throw new ExpenseValidationError(
      `タイトルは${EXPENSE_RULES.MAX_TITLE_LENGTH}文字以内で入力してください`,
    );
  }
  return trimmed;
}

/**
 * メモのバリデーション
 *
 * @throws {ExpenseValidationError} メモが長すぎる場合
 */
export function validateMemo(memo: string | undefined): void {
  if (memo && memo.length > EXPENSE_RULES.MAX_MEMO_LENGTH) {
    throw new ExpenseValidationError("メモは500文字以内で入力してください");
  }
}

/**
 * 支出入力の全体バリデーション
 *
 * @throws {ExpenseValidationError} バリデーションエラーの場合
 */
export function validateExpenseInput(input: ExpenseInput): void {
  validateAmount(input.amount);
  validateDate(input.date);
  validateMemo(input.memo);
}

/**
 * 割合指定のバリデーション
 */
export function validateRatioSplit(
  ratios: RatioSplitInput[],
  memberIds: Id<"users">[],
): void {
  if (ratios.length === 0) {
    throw new ExpenseValidationError("割合が指定されていません");
  }

  const ratioUserIds = new Set(ratios.map((r) => r.userId));
  for (const memberId of memberIds) {
    if (!ratioUserIds.has(memberId)) {
      throw new ExpenseValidationError("全メンバーの割合を指定してください");
    }
  }

  for (const r of ratios) {
    if (!Number.isInteger(r.ratio) || r.ratio < 0 || r.ratio > 100) {
      throw new ExpenseValidationError("割合は0〜100の整数で指定してください");
    }
  }

  const total = ratios.reduce((sum, r) => sum + r.ratio, 0);
  if (total !== 100) {
    throw new ExpenseValidationError("割合の合計は100%である必要があります");
  }
}

/**
 * 金額指定のバリデーション
 */
export function validateAmountSplit(
  amounts: AmountSplitInput[],
  totalAmount: number,
  memberIds: Id<"users">[],
): void {
  if (amounts.length === 0) {
    throw new ExpenseValidationError("金額が指定されていません");
  }

  const amountUserIds = new Set(amounts.map((a) => a.userId));
  for (const memberId of memberIds) {
    if (!amountUserIds.has(memberId)) {
      throw new ExpenseValidationError("全メンバーの金額を指定してください");
    }
  }

  for (const a of amounts) {
    if (!Number.isInteger(a.amount) || a.amount < 0) {
      throw new ExpenseValidationError("金額は0以上の整数で指定してください");
    }
  }

  const total = amounts.reduce((sum, a) => sum + a.amount, 0);
  if (total !== totalAmount) {
    throw new ExpenseValidationError("金額の合計が支出金額と一致しません");
  }
}

/**
 * 全額負担のバリデーション
 */
export function validateFullSplit(
  bearerId: Id<"users">,
  memberIds: Id<"users">[],
): void {
  if (!memberIds.includes(bearerId)) {
    throw new ExpenseValidationError(
      "負担者はメンバーに含まれている必要があります",
    );
  }
}

/**
 * 負担方法詳細のバリデーション
 */
export function validateSplitDetails(
  details: SplitDetails,
  totalAmount: number,
  memberIds: Id<"users">[],
): void {
  switch (details.method) {
    case "equal":
      break;
    case "ratio":
      validateRatioSplit(details.ratios, memberIds);
      break;
    case "amount":
      validateAmountSplit(details.amounts, totalAmount, memberIds);
      break;
    case "full":
      validateFullSplit(details.bearerId, memberIds);
      break;
  }
}

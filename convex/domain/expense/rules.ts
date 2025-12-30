import { EXPENSE_RULES, type ExpenseInput } from "./types";

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
      "金額は1円から1億円の範囲で入力してください",
    );
  }
}

/**
 * 日付のバリデーション
 *
 * @throws {ExpenseValidationError} 日付形式が不正または未来日の場合
 */
export function validateDate(date: string): void {
  if (!EXPENSE_RULES.DATE_FORMAT_REGEX.test(date)) {
    throw new ExpenseValidationError("日付の形式が正しくありません");
  }

  const today = new Date().toISOString().split("T")[0];
  if (date > today) {
    throw new ExpenseValidationError("未来の日付は指定できません");
  }
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

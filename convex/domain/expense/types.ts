import type { Id } from "../../_generated/dataModel";

/**
 * 負担配分の計算結果
 */
export interface SplitResult {
  userId: Id<"users">;
  amount: number;
}

/**
 * 負担方法
 */
export type SplitMethod = "equal" | "ratio" | "amount" | "full";

/**
 * 支出入力データ（バリデーション前）
 */
export interface ExpenseInput {
  amount: number;
  date: string;
  memo?: string;
}

/**
 * 支出のビジネスルール定数
 */
export const EXPENSE_RULES = {
  /** 最小金額（円） */
  MIN_AMOUNT: 1,
  /** 最大金額（円） */
  MAX_AMOUNT: 100_000_000,
  /** メモの最大文字数 */
  MAX_MEMO_LENGTH: 500,
  /** 日付フォーマット */
  DATE_FORMAT_REGEX: /^\d{4}-\d{2}-\d{2}$/,
} as const;

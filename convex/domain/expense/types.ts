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

export interface RatioSplitInput {
  userId: Id<"users">;
  ratio: number; // 0-100 の整数（%）
}

export interface AmountSplitInput {
  userId: Id<"users">;
  amount: number; // 0以上の整数（円）
}

export type SplitDetails =
  | { method: "equal"; memberIds?: Id<"users">[] }
  | { method: "ratio"; ratios: RatioSplitInput[] }
  | { method: "amount"; amounts: AmountSplitInput[] }
  | { method: "full"; bearerId: Id<"users"> };

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
  /** タイトルの最大文字数 */
  MAX_TITLE_LENGTH: 100,
  /** メモの最大文字数 */
  MAX_MEMO_LENGTH: 500,
  /** 日付フォーマット */
  DATE_FORMAT_REGEX: /^\d{4}-\d{2}-\d{2}$/,
} as const;

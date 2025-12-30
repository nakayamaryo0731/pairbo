import type { Id } from "../../_generated/dataModel";

/**
 * 精算ステータス
 */
export type SettlementStatus = "pending" | "settled";

/**
 * メンバーの収支
 */
export interface MemberBalance {
  /** ユーザーID */
  userId: Id<"users">;
  /** 支払った金額の合計 */
  paid: number;
  /** 負担すべき金額の合計 */
  owed: number;
  /** 差額（プラス=受け取る、マイナス=支払う） */
  net: number;
}

/**
 * 精算時の送金情報
 */
export interface Payment {
  /** 送金元ユーザーID */
  fromUserId: Id<"users">;
  /** 送金先ユーザーID */
  toUserId: Id<"users">;
  /** 送金額 */
  amount: number;
}

/**
 * 精算期間
 */
export interface SettlementPeriod {
  /** 開始日（YYYY-MM-DD） */
  startDate: string;
  /** 終了日（YYYY-MM-DD） */
  endDate: string;
}

/**
 * 精算プレビュー（未確定の精算情報）
 */
export interface SettlementPreview {
  /** 精算期間 */
  period: SettlementPeriod;
  /** 各メンバーの収支 */
  balances: MemberBalance[];
  /** 精算に必要な送金リスト */
  payments: Payment[];
  /** 既存の精算があるかどうか */
  existingSettlementId: Id<"settlements"> | null;
}

/**
 * 精算のビジネスルール定数
 */
export const SETTLEMENT_RULES = {
  /** 締め日の最小値 */
  MIN_CLOSING_DAY: 1,
  /** 締め日の最大値 */
  MAX_CLOSING_DAY: 28,
} as const;

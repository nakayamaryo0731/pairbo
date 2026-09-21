/**
 * グループ入力データ（バリデーション前）
 */
export interface GroupInput {
  name: string;
  description?: string;
}

/**
 * グループのビジネスルール定数
 */
export const GROUP_RULES = {
  /** グループ名の最大文字数 */
  MAX_NAME_LENGTH: 50,
  /** 説明の最大文字数 */
  MAX_DESCRIPTION_LENGTH: 200,
  /** 締め日のデフォルト値 */
  DEFAULT_CLOSING_DAY: 25,
  /** 締め日の最小値 */
  MIN_CLOSING_DAY: 1,
  /** 締め日の最大値 */
  MAX_CLOSING_DAY: 28,
} as const;

/**
 * 締め日: 固定日（1〜28）または末日締め。
 * 末日は月ごとの実際の最終日（28〜31日）に自動で追従する。
 */
export type ClosingDay = number | "end_of_month";

/**
 * メンバーロール
 */
export type MemberRole = "owner" | "member";

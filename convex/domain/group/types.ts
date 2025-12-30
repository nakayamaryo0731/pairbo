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
 * メンバーロール
 */
export type MemberRole = "owner" | "member";

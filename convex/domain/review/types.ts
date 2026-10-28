/**
 * 感想募集のビジネスルール定数
 */
export const REVIEW_RULES = {
  /** 2人目のメンバーが参加してからの日数（月ごとの精算を1回は経験している目安） */
  MIN_PAIRED_DAYS: 30,
  /** グループの支出件数 */
  MIN_EXPENSES: 30,
  /** 自由記述の最大文字数 */
  TEXT_MAX_LENGTH: 1000,
} as const;

export type ReviewTextInput = {
  before: string;
  change: string;
  likes?: string;
  improvements?: string;
};

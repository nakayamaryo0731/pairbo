/**
 * 招待のビジネスルール定数
 */
export const INVITATION_RULES = {
  /** 招待リンクの有効期間（ミリ秒） - 7日間 */
  EXPIRATION_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * 招待検証エラーの種類
 */
export type InvitationErrorType =
  | "invalid_token"
  | "expired"
  | "already_used"
  | "group_not_found";

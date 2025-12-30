import { type InvitationErrorType } from "./types";

/**
 * 招待バリデーションエラー
 */
export class InvitationValidationError extends Error {
  public readonly errorType: InvitationErrorType;

  constructor(errorType: InvitationErrorType, message: string) {
    super(message);
    this.name = "InvitationValidationError";
    this.errorType = errorType;
  }
}

/**
 * 招待の有効期限をチェック
 *
 * @param expiresAt 有効期限のタイムスタンプ
 * @param now 現在時刻（デフォルト: Date.now()）
 * @returns 有効期限内かどうか
 */
export function isInvitationExpired(
  expiresAt: number,
  now: number = Date.now(),
): boolean {
  return expiresAt < now;
}

/**
 * 招待が使用済みかチェック
 *
 * @param usedAt 使用日時（undefined = 未使用）
 * @returns 使用済みかどうか
 */
export function isInvitationUsed(usedAt: number | undefined): boolean {
  return usedAt !== undefined;
}

/**
 * 招待の有効期限を計算
 *
 * @param createdAt 作成日時
 * @param expirationMs 有効期間（ミリ秒）
 * @returns 有効期限のタイムスタンプ
 */
export function calculateExpiresAt(
  createdAt: number,
  expirationMs: number,
): number {
  return createdAt + expirationMs;
}

/**
 * 招待検証エラーのメッセージを取得
 *
 * @param errorType エラー種別
 * @returns ユーザー向けエラーメッセージ
 */
export function getInvitationErrorMessage(
  errorType: InvitationErrorType,
): string {
  switch (errorType) {
    case "invalid_token":
      return "無効な招待リンクです";
    case "expired":
      return "招待リンクの有効期限が切れています";
    case "already_used":
      return "この招待リンクは既に使用されています";
    case "group_not_found":
      return "グループが見つかりません";
  }
}

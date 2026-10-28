import { REVIEW_RULES, type ReviewTextInput } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewValidationError";
  }
}

/**
 * 感想のお願いを出してよいグループか判定する
 *
 * @param memberJoinedAts グループメンバー全員の参加日時
 * @param expenseCount 支出件数（MIN_EXPENSES件まで数えれば足りる）
 */
export function isReviewPromptEligible(
  memberJoinedAts: number[],
  expenseCount: number,
  now: number = Date.now(),
): boolean {
  if (memberJoinedAts.length < 2) return false;

  const pairedAt = [...memberJoinedAts].sort((a, b) => a - b)[1];
  if (now - pairedAt < REVIEW_RULES.MIN_PAIRED_DAYS * DAY_MS) return false;

  return expenseCount >= REVIEW_RULES.MIN_EXPENSES;
}

/**
 * 感想の自由記述を検証し、前後の空白を除いた値を返す
 * 任意項目は空なら undefined にする
 */
export function validateReviewText(input: ReviewTextInput): ReviewTextInput {
  const before = requireText(input.before, "使う前のお金の分け方");
  const change = requireText(input.change, "Pairboを使って変わったこと");
  const likes = optionalText(input.likes, "気に入っているところ");
  const improvements = optionalText(input.improvements, "改善してほしいところ");
  return { before, change, likes, improvements };
}

function requireText(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ReviewValidationError(`${label}を入力してください`);
  }
  return checkLength(trimmed, label);
}

function optionalText(
  value: string | undefined,
  label: string,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return checkLength(trimmed, label);
}

function checkLength(value: string, label: string): string {
  if (value.length > REVIEW_RULES.TEXT_MAX_LENGTH) {
    throw new ReviewValidationError(
      `${label}は${REVIEW_RULES.TEXT_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return value;
}

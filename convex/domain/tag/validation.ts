import { TAG_COLORS, TAG_LIMITS, TagColor } from "./types";

export class TagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TagValidationError";
  }
}

/**
 * タグ名のバリデーション（不正な場合は TagValidationError をスロー）
 * @returns トリム済みのタグ名
 */
export function validateTagName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length < TAG_LIMITS.MIN_NAME_LENGTH) {
    throw new TagValidationError("タグ名を入力してください");
  }

  if (trimmed.length > TAG_LIMITS.MAX_NAME_LENGTH) {
    throw new TagValidationError(
      `タグ名は${TAG_LIMITS.MAX_NAME_LENGTH}文字以内で入力してください`,
    );
  }

  return trimmed;
}

/**
 * タグの色バリデーション
 */
export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

/**
 * ランダムなタグ色を取得
 */
export function getRandomTagColor(): TagColor {
  const index = Math.floor(Math.random() * TAG_COLORS.length);
  return TAG_COLORS[index];
}

/**
 * タグ名を正規化（前後の空白を除去）
 */
export function normalizeTagName(name: string): string {
  return name.trim();
}

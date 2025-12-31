import { CATEGORY_RULES } from "./types";

export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryValidationError";
  }
}

export function validateCategoryName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < CATEGORY_RULES.NAME_MIN_LENGTH) {
    throw new CategoryValidationError("カテゴリ名を入力してください");
  }
  if (trimmed.length > CATEGORY_RULES.NAME_MAX_LENGTH) {
    throw new CategoryValidationError(
      `カテゴリ名は${CATEGORY_RULES.NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return trimmed;
}

export function validateCategoryIcon(icon: string): string {
  // Use Intl.Segmenter to properly count grapheme clusters (emoji)
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const segments = [...segmenter.segment(icon)];

  if (segments.length !== 1) {
    throw new CategoryValidationError(
      "アイコンは絵文字1文字で入力してください",
    );
  }
  return icon;
}

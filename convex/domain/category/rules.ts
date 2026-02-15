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
  const trimmed = icon.trim();
  if (trimmed.length === 0 || trimmed.length > CATEGORY_RULES.ICON_MAX_LENGTH) {
    throw new CategoryValidationError("アイコン名を入力してください");
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed)) {
    throw new CategoryValidationError("アイコン名の形式が正しくありません");
  }
  return trimmed;
}

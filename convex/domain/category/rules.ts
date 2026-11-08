import type { Id } from "../../_generated/dataModel";
import { validateRatioSplit, type RatioSplitInput } from "../expense";
import {
  CATEGORY_ICON_NAMES,
  CATEGORY_RULES,
  type CategoryIconName,
} from "./types";

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

export function isValidCategoryIcon(name: string): name is CategoryIconName {
  return (CATEGORY_ICON_NAMES as readonly string[]).includes(name);
}

export function validateCategoryIcon(icon: string): CategoryIconName {
  const trimmed = icon.trim();
  if (trimmed.length === 0) {
    throw new CategoryValidationError("アイコン名を入力してください");
  }
  if (!isValidCategoryIcon(trimmed)) {
    throw new CategoryValidationError("アイコン名の形式が正しくありません");
  }
  return trimmed;
}

/**
 * カテゴリのデフォルト割合のバリデーション
 *
 * 支出の割合指定と同じ数値ルール（0〜100の整数、合計100）に加え、
 * 対象がグループメンバーで重複がないことを検証する
 */
export function validateDefaultRatios(
  ratios: RatioSplitInput[],
  groupMemberIds: Id<"users">[],
): void {
  const userIds = ratios.map((r) => r.userId);
  if (new Set(userIds).size !== userIds.length) {
    throw new CategoryValidationError("同じメンバーの割合が重複しています");
  }
  if (userIds.some((id) => !groupMemberIds.includes(id))) {
    throw new CategoryValidationError(
      "割合の対象メンバーがグループに所属していません",
    );
  }
  validateRatioSplit(ratios, userIds);
}

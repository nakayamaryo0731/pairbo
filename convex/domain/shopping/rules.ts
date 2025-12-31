import { SHOPPING_ITEM_RULES } from "./types";

export class ShoppingItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShoppingItemValidationError";
  }
}

/**
 * 買い物アイテム名のバリデーション
 */
export function validateShoppingItemName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < SHOPPING_ITEM_RULES.NAME_MIN_LENGTH) {
    throw new ShoppingItemValidationError("アイテム名を入力してください");
  }
  if (trimmed.length > SHOPPING_ITEM_RULES.NAME_MAX_LENGTH) {
    throw new ShoppingItemValidationError(
      `アイテム名は${SHOPPING_ITEM_RULES.NAME_MAX_LENGTH}文字以内で入力してください`,
    );
  }
  return trimmed;
}

/**
 * 履歴表示の開始日時を計算
 */
export function getHistoryStartTime(): number {
  const now = Date.now();
  const historyDaysMs = SHOPPING_ITEM_RULES.HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return now - historyDaysMs;
}

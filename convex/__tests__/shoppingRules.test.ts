import { describe, expect, test } from "vitest";
import {
  validateShoppingItemName,
  getHistoryStartTime,
  ShoppingItemValidationError,
} from "../domain/shopping";
import { SHOPPING_ITEM_RULES } from "../domain/shopping/types";

describe("買い物アイテム名バリデーション", () => {
  describe("validateShoppingItemName", () => {
    test("正常なアイテム名を受け付ける", () => {
      expect(validateShoppingItemName("牛乳")).toBe("牛乳");
      expect(validateShoppingItemName("パン")).toBe("パン");
      expect(validateShoppingItemName("a")).toBe("a");
    });

    test("前後の空白をトリムする", () => {
      expect(validateShoppingItemName("  牛乳  ")).toBe("牛乳");
      expect(validateShoppingItemName("\tパン\n")).toBe("パン");
    });

    test("空文字列はエラー", () => {
      expect(() => validateShoppingItemName("")).toThrow(
        ShoppingItemValidationError,
      );
      expect(() => validateShoppingItemName("")).toThrow(
        "アイテム名を入力してください",
      );
    });

    test("空白のみはエラー", () => {
      expect(() => validateShoppingItemName("   ")).toThrow(
        ShoppingItemValidationError,
      );
      expect(() => validateShoppingItemName("\t\n")).toThrow(
        "アイテム名を入力してください",
      );
    });

    test("最大文字数を超えるとエラー", () => {
      const maxLength = SHOPPING_ITEM_RULES.NAME_MAX_LENGTH;
      const validName = "あ".repeat(maxLength);
      const invalidName = "あ".repeat(maxLength + 1);

      expect(validateShoppingItemName(validName)).toBe(validName);
      expect(() => validateShoppingItemName(invalidName)).toThrow(
        ShoppingItemValidationError,
      );
      expect(() => validateShoppingItemName(invalidName)).toThrow(
        `アイテム名は${maxLength}文字以内で入力してください`,
      );
    });

    test("日本語文字を正しく数える", () => {
      const maxLength = SHOPPING_ITEM_RULES.NAME_MAX_LENGTH;
      // 100文字の日本語
      const longJapaneseName = "あ".repeat(maxLength);
      expect(longJapaneseName.length).toBe(maxLength);
      expect(validateShoppingItemName(longJapaneseName)).toBe(longJapaneseName);
    });
  });
});

describe("履歴表示の開始日時計算", () => {
  describe("getHistoryStartTime", () => {
    test("30日前のタイムスタンプを返す", () => {
      const now = Date.now();
      const result = getHistoryStartTime();
      const expectedDays = SHOPPING_ITEM_RULES.HISTORY_DAYS;
      const expectedMs = expectedDays * 24 * 60 * 60 * 1000;

      // 許容誤差は1秒
      expect(result).toBeGreaterThanOrEqual(now - expectedMs - 1000);
      expect(result).toBeLessThanOrEqual(now - expectedMs + 1000);
    });

    test("HISTORY_DAYS日前より後のタイムスタンプより小さい", () => {
      const result = getHistoryStartTime();
      const recentTime = Date.now() - 1000; // 1秒前
      expect(result).toBeLessThan(recentTime);
    });
  });
});

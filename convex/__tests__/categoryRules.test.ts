import { describe, expect, test } from "vitest";
import {
  validateCategoryName,
  validateCategoryIcon,
  CategoryValidationError,
} from "../domain/category";
import { CATEGORY_RULES } from "../domain/category/types";

describe("カテゴリ名バリデーション", () => {
  describe("validateCategoryName", () => {
    test("正常なカテゴリ名を受け付ける", () => {
      expect(validateCategoryName("食費")).toBe("食費");
      expect(validateCategoryName("日用品")).toBe("日用品");
      expect(validateCategoryName("a")).toBe("a");
    });

    test("前後の空白をトリムする", () => {
      expect(validateCategoryName("  食費  ")).toBe("食費");
      expect(validateCategoryName("\t日用品\n")).toBe("日用品");
    });

    test("空文字列はエラー", () => {
      expect(() => validateCategoryName("")).toThrow(CategoryValidationError);
      expect(() => validateCategoryName("")).toThrow(
        "カテゴリ名を入力してください",
      );
    });

    test("空白のみはエラー", () => {
      expect(() => validateCategoryName("   ")).toThrow(
        CategoryValidationError,
      );
      expect(() => validateCategoryName("\t\n")).toThrow(
        "カテゴリ名を入力してください",
      );
    });

    test("最大文字数を超えるとエラー", () => {
      const maxLength = CATEGORY_RULES.NAME_MAX_LENGTH;
      const validName = "あ".repeat(maxLength);
      const invalidName = "あ".repeat(maxLength + 1);

      expect(validateCategoryName(validName)).toBe(validName);
      expect(() => validateCategoryName(invalidName)).toThrow(
        CategoryValidationError,
      );
      expect(() => validateCategoryName(invalidName)).toThrow(
        `カテゴリ名は${maxLength}文字以内で入力してください`,
      );
    });

    test("日本語文字を正しく数える", () => {
      const maxLength = CATEGORY_RULES.NAME_MAX_LENGTH;
      // 20文字の日本語
      const longJapaneseName = "あいうえおかきくけこさしすせそたちつてと";
      expect(longJapaneseName.length).toBe(maxLength);
      expect(validateCategoryName(longJapaneseName)).toBe(longJapaneseName);
    });
  });
});

describe("カテゴリアイコンバリデーション", () => {
  describe("validateCategoryIcon", () => {
    test("kebab-caseのアイコン名を受け付ける", () => {
      expect(validateCategoryIcon("shopping-cart")).toBe("shopping-cart");
      expect(validateCategoryIcon("package")).toBe("package");
      expect(validateCategoryIcon("home")).toBe("home");
      expect(validateCategoryIcon("train-front")).toBe("train-front");
      expect(validateCategoryIcon("gamepad-2")).toBe("gamepad-2");
    });

    test("前後の空白をトリムする", () => {
      expect(validateCategoryIcon("  home  ")).toBe("home");
    });

    test("空文字列はエラー", () => {
      expect(() => validateCategoryIcon("")).toThrow(CategoryValidationError);
      expect(() => validateCategoryIcon("")).toThrow(
        "アイコン名を入力してください",
      );
    });

    test("大文字を含む文字列はエラー", () => {
      expect(() => validateCategoryIcon("ShoppingCart")).toThrow(
        CategoryValidationError,
      );
      expect(() => validateCategoryIcon("Home")).toThrow(
        CategoryValidationError,
      );
    });

    test("スペースを含む文字列はエラー", () => {
      expect(() => validateCategoryIcon("shopping cart")).toThrow(
        CategoryValidationError,
      );
    });

    test("絵文字はエラー", () => {
      expect(() => validateCategoryIcon("🍔")).toThrow(CategoryValidationError);
      expect(() => validateCategoryIcon("📦")).toThrow(CategoryValidationError);
    });

    test("連続ハイフンはエラー", () => {
      expect(() => validateCategoryIcon("shopping--cart")).toThrow(
        CategoryValidationError,
      );
    });

    test("先頭・末尾ハイフンはエラー", () => {
      expect(() => validateCategoryIcon("-home")).toThrow(
        CategoryValidationError,
      );
      expect(() => validateCategoryIcon("home-")).toThrow(
        CategoryValidationError,
      );
    });
  });
});

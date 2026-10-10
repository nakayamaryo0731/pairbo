import { describe, expect, test } from "vitest";
import {
  validateCategoryName,
  validateCategoryIcon,
  isValidCategoryIcon,
  CategoryValidationError,
} from "../domain/category";
import { CATEGORY_RULES } from "../domain/category/types";
import { PRESET_CATEGORIES } from "../lib/presetCategories";

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
    test("一覧にあるアイコン名を受け付ける", () => {
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

    test("形式が正しくても一覧にないアイコン名はエラー", () => {
      expect(() => validateCategoryIcon("unknown-icon")).toThrow(
        "アイコン名の形式が正しくありません",
      );
    });

    test("Object.prototype のプロパティ名はエラー", () => {
      for (const name of ["constructor", "tostring", "valueof"]) {
        expect(() => validateCategoryIcon(name)).toThrow(
          CategoryValidationError,
        );
      }
    });

    test("プリセットカテゴリのアイコンはすべて受け付ける", () => {
      for (const preset of PRESET_CATEGORIES) {
        expect(validateCategoryIcon(preset.icon)).toBe(preset.icon);
      }
    });
  });

  describe("isValidCategoryIcon", () => {
    test("一覧にあるアイコン名は true", () => {
      expect(isValidCategoryIcon("package")).toBe(true);
      expect(isValidCategoryIcon("gamepad-2")).toBe(true);
    });

    test("一覧にないアイコン名や Object.prototype のプロパティ名は false", () => {
      expect(isValidCategoryIcon("unknown-icon")).toBe(false);
      expect(isValidCategoryIcon("constructor")).toBe(false);
      expect(isValidCategoryIcon("__proto__")).toBe(false);
      expect(isValidCategoryIcon("toString")).toBe(false);
    });
  });
});

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
    test("単一の絵文字を受け付ける", () => {
      expect(validateCategoryIcon("🍔")).toBe("🍔");
      expect(validateCategoryIcon("📦")).toBe("📦");
      expect(validateCategoryIcon("💰")).toBe("💰");
    });

    test("複合絵文字（ZWJシーケンス）を単一として受け付ける", () => {
      // Intl.Segmenterでグラフェムクラスタとして正しく1つとカウント
      expect(validateCategoryIcon("👨‍👩‍👧")).toBe("👨‍👩‍👧");
    });

    test("肌色修飾子付き絵文字を受け付ける", () => {
      expect(validateCategoryIcon("👍🏽")).toBe("👍🏽");
    });

    test("複数の絵文字はエラー", () => {
      expect(() => validateCategoryIcon("🍔🍕")).toThrow(
        CategoryValidationError,
      );
      expect(() => validateCategoryIcon("🍔🍕")).toThrow(
        "アイコンは絵文字1文字で入力してください",
      );
    });

    test("空文字列はエラー", () => {
      expect(() => validateCategoryIcon("")).toThrow(CategoryValidationError);
      expect(() => validateCategoryIcon("")).toThrow(
        "アイコンは絵文字1文字で入力してください",
      );
    });

    test("通常文字はエラー（2文字以上の場合）", () => {
      expect(() => validateCategoryIcon("AB")).toThrow(CategoryValidationError);
    });

    test("単一の通常文字は受け付ける（仕様上許容）", () => {
      // 現在の実装では1文字であれば通常文字も許容
      expect(validateCategoryIcon("A")).toBe("A");
    });
  });
});

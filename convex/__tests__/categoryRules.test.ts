import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  validateCategoryName,
  validateCategoryIcon,
  isValidCategoryIcon,
  validateDefaultRatios,
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

describe("デフォルト割合バリデーション", () => {
  const userA = "user_a" as Id<"users">;
  const userB = "user_b" as Id<"users">;
  const userC = "user_c" as Id<"users">;
  const members = [userA, userB];

  test("合計100%のメンバー割合を受け付ける", () => {
    expect(() =>
      validateDefaultRatios(
        [
          { userId: userA, ratio: 60 },
          { userId: userB, ratio: 40 },
        ],
        members,
      ),
    ).not.toThrow();
  });

  test("一部メンバーのみの割合も受け付ける", () => {
    expect(() =>
      validateDefaultRatios([{ userId: userA, ratio: 100 }], members),
    ).not.toThrow();
  });

  test("空配列はエラー", () => {
    expect(() => validateDefaultRatios([], members)).toThrow(
      "割合が指定されていません",
    );
  });

  test("同じメンバーの重複はエラー", () => {
    expect(() =>
      validateDefaultRatios(
        [
          { userId: userA, ratio: 50 },
          { userId: userA, ratio: 50 },
        ],
        members,
      ),
    ).toThrow("同じメンバーの割合が重複しています");
  });

  test("グループ外のメンバーはエラー", () => {
    expect(() =>
      validateDefaultRatios(
        [
          { userId: userA, ratio: 50 },
          { userId: userC, ratio: 50 },
        ],
        members,
      ),
    ).toThrow(CategoryValidationError);
  });

  test("合計が100%でない場合はエラー", () => {
    expect(() =>
      validateDefaultRatios(
        [
          { userId: userA, ratio: 60 },
          { userId: userB, ratio: 30 },
        ],
        members,
      ),
    ).toThrow("割合の合計は100%である必要があります");
  });

  test("範囲外・非整数の割合はエラー", () => {
    for (const [a, b] of [
      [110, -10],
      [50.5, 49.5],
    ]) {
      expect(() =>
        validateDefaultRatios(
          [
            { userId: userA, ratio: a },
            { userId: userB, ratio: b },
          ],
          members,
        ),
      ).toThrow("割合は0〜100の整数で指定してください");
    }
  });
});

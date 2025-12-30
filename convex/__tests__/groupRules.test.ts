import { describe, expect, test } from "vitest";
import {
  validateGroupName,
  validateGroupDescription,
  validateGroupInput,
  validateClosingDay,
  GroupValidationError,
  GROUP_RULES,
} from "../domain/group";

describe("group/rules", () => {
  describe("validateGroupName", () => {
    test("有効な名前は通過する", () => {
      expect(validateGroupName("テストグループ")).toBe("テストグループ");
      expect(validateGroupName("a")).toBe("a");
      expect(validateGroupName("a".repeat(50))).toBe("a".repeat(50));
    });

    test("前後の空白はトリムされる", () => {
      expect(validateGroupName("  テスト  ")).toBe("テスト");
    });

    test("空文字はエラー", () => {
      expect(() => validateGroupName("")).toThrow(GroupValidationError);
      expect(() => validateGroupName("")).toThrow(
        "グループ名を入力してください",
      );
    });

    test("空白のみはエラー", () => {
      expect(() => validateGroupName("   ")).toThrow(GroupValidationError);
      expect(() => validateGroupName("   ")).toThrow(
        "グループ名を入力してください",
      );
    });

    test("50文字超はエラー", () => {
      expect(() => validateGroupName("a".repeat(51))).toThrow(
        GroupValidationError,
      );
      expect(() => validateGroupName("a".repeat(51))).toThrow(
        "グループ名は50文字以内で入力してください",
      );
    });
  });

  describe("validateGroupDescription", () => {
    test("undefinedは通過する", () => {
      expect(validateGroupDescription(undefined)).toBeUndefined();
    });

    test("空文字はundefinedになる", () => {
      expect(validateGroupDescription("")).toBeUndefined();
    });

    test("空白のみはundefinedになる", () => {
      expect(validateGroupDescription("   ")).toBeUndefined();
    });

    test("有効な説明は通過する", () => {
      expect(validateGroupDescription("テスト説明")).toBe("テスト説明");
      expect(validateGroupDescription("a".repeat(200))).toBe("a".repeat(200));
    });

    test("前後の空白はトリムされる", () => {
      expect(validateGroupDescription("  テスト  ")).toBe("テスト");
    });

    test("200文字超はエラー", () => {
      expect(() => validateGroupDescription("a".repeat(201))).toThrow(
        GroupValidationError,
      );
      expect(() => validateGroupDescription("a".repeat(201))).toThrow(
        "説明は200文字以内で入力してください",
      );
    });
  });

  describe("validateGroupInput", () => {
    test("有効な入力は通過する", () => {
      const result = validateGroupInput({
        name: "テストグループ",
        description: "説明文",
      });
      expect(result.name).toBe("テストグループ");
      expect(result.description).toBe("説明文");
    });

    test("説明なしでも通過する", () => {
      const result = validateGroupInput({ name: "テストグループ" });
      expect(result.name).toBe("テストグループ");
      expect(result.description).toBeUndefined();
    });

    test("空の説明はundefinedになる", () => {
      const result = validateGroupInput({
        name: "テストグループ",
        description: "",
      });
      expect(result.description).toBeUndefined();
    });

    test("名前が不正な場合はエラー", () => {
      expect(() => validateGroupInput({ name: "" })).toThrow(
        GroupValidationError,
      );
    });

    test("説明が長すぎる場合はエラー", () => {
      expect(() =>
        validateGroupInput({
          name: "テストグループ",
          description: "a".repeat(201),
        }),
      ).toThrow(GroupValidationError);
    });
  });

  describe("validateClosingDay", () => {
    test("有効な締め日は通過する", () => {
      expect(() => validateClosingDay(1)).not.toThrow();
      expect(() => validateClosingDay(15)).not.toThrow();
      expect(() => validateClosingDay(25)).not.toThrow();
      expect(() => validateClosingDay(28)).not.toThrow();
    });

    test("小数はエラー", () => {
      expect(() => validateClosingDay(15.5)).toThrow(GroupValidationError);
      expect(() => validateClosingDay(15.5)).toThrow(
        "締め日は整数で入力してください",
      );
    });

    test("0以下はエラー", () => {
      expect(() => validateClosingDay(0)).toThrow(GroupValidationError);
      expect(() => validateClosingDay(-1)).toThrow(
        "締め日は1〜28の間で設定してください",
      );
    });

    test("28超はエラー", () => {
      expect(() => validateClosingDay(29)).toThrow(GroupValidationError);
      expect(() => validateClosingDay(29)).toThrow(
        "締め日は1〜28の間で設定してください",
      );
    });
  });

  describe("GROUP_RULES", () => {
    test("定数が正しく定義されている", () => {
      expect(GROUP_RULES.MAX_NAME_LENGTH).toBe(50);
      expect(GROUP_RULES.MAX_DESCRIPTION_LENGTH).toBe(200);
      expect(GROUP_RULES.DEFAULT_CLOSING_DAY).toBe(25);
      expect(GROUP_RULES.MIN_CLOSING_DAY).toBe(1);
      expect(GROUP_RULES.MAX_CLOSING_DAY).toBe(28);
    });
  });
});

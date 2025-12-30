import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import {
  validateAmount,
  validateDate,
  validateMemo,
  validateExpenseInput,
  ExpenseValidationError,
  EXPENSE_RULES,
} from "../domain/expense";

describe("expense/rules", () => {
  describe("validateAmount", () => {
    test("有効な金額は通過する", () => {
      expect(() => validateAmount(1)).not.toThrow();
      expect(() => validateAmount(1000)).not.toThrow();
      expect(() => validateAmount(100_000_000)).not.toThrow();
    });

    test("小数はエラー", () => {
      expect(() => validateAmount(100.5)).toThrow(ExpenseValidationError);
      expect(() => validateAmount(100.5)).toThrow(
        "金額は整数で入力してください",
      );
    });

    test("0以下はエラー", () => {
      expect(() => validateAmount(0)).toThrow(ExpenseValidationError);
      expect(() => validateAmount(-100)).toThrow(
        "金額は1円から1億円の範囲で入力してください",
      );
    });

    test("1億円超はエラー", () => {
      expect(() => validateAmount(100_000_001)).toThrow(ExpenseValidationError);
      expect(() => validateAmount(100_000_001)).toThrow(
        "金額は1円から1億円の範囲で入力してください",
      );
    });
  });

  describe("validateDate", () => {
    beforeEach(() => {
      // 固定日時を設定（2024-12-30）
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-12-30T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("有効な日付は通過する", () => {
      expect(() => validateDate("2024-12-30")).not.toThrow();
      expect(() => validateDate("2024-01-01")).not.toThrow();
      expect(() => validateDate("2023-12-31")).not.toThrow();
    });

    test("不正な形式はエラー", () => {
      expect(() => validateDate("2024/12/30")).toThrow(ExpenseValidationError);
      expect(() => validateDate("12-30-2024")).toThrow(
        "日付の形式が正しくありません",
      );
      expect(() => validateDate("invalid")).toThrow(ExpenseValidationError);
    });

    test("未来日はエラー", () => {
      expect(() => validateDate("2024-12-31")).toThrow(ExpenseValidationError);
      expect(() => validateDate("2025-01-01")).toThrow(
        "未来の日付は指定できません",
      );
    });
  });

  describe("validateMemo", () => {
    test("undefinedは通過する", () => {
      expect(() => validateMemo(undefined)).not.toThrow();
    });

    test("空文字は通過する", () => {
      expect(() => validateMemo("")).not.toThrow();
    });

    test("500文字以内は通過する", () => {
      expect(() => validateMemo("a".repeat(500))).not.toThrow();
    });

    test("500文字超はエラー", () => {
      expect(() => validateMemo("a".repeat(501))).toThrow(
        ExpenseValidationError,
      );
      expect(() => validateMemo("a".repeat(501))).toThrow(
        "メモは500文字以内で入力してください",
      );
    });
  });

  describe("validateExpenseInput", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-12-30T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test("有効な入力は通過する", () => {
      expect(() =>
        validateExpenseInput({
          amount: 1000,
          date: "2024-12-30",
          memo: "テストメモ",
        }),
      ).not.toThrow();
    });

    test("メモなしでも通過する", () => {
      expect(() =>
        validateExpenseInput({
          amount: 1000,
          date: "2024-12-30",
        }),
      ).not.toThrow();
    });

    test("金額が不正な場合はエラー", () => {
      expect(() =>
        validateExpenseInput({
          amount: 0,
          date: "2024-12-30",
        }),
      ).toThrow(ExpenseValidationError);
    });

    test("日付が不正な場合はエラー", () => {
      expect(() =>
        validateExpenseInput({
          amount: 1000,
          date: "invalid",
        }),
      ).toThrow(ExpenseValidationError);
    });

    test("メモが長すぎる場合はエラー", () => {
      expect(() =>
        validateExpenseInput({
          amount: 1000,
          date: "2024-12-30",
          memo: "a".repeat(501),
        }),
      ).toThrow(ExpenseValidationError);
    });
  });

  describe("EXPENSE_RULES", () => {
    test("定数が正しく定義されている", () => {
      expect(EXPENSE_RULES.MIN_AMOUNT).toBe(1);
      expect(EXPENSE_RULES.MAX_AMOUNT).toBe(100_000_000);
      expect(EXPENSE_RULES.MAX_MEMO_LENGTH).toBe(500);
      expect(EXPENSE_RULES.DATE_FORMAT_REGEX).toEqual(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

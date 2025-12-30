import { describe, expect, test } from "vitest";
import {
  validateYear,
  validateMonth,
  validateClosingDay,
  validateSettlementPeriodInput,
  SettlementValidationError,
  SETTLEMENT_RULES,
} from "../domain/settlement";

describe("settlement/rules", () => {
  describe("validateYear", () => {
    test("有効な年は通過する", () => {
      expect(() => validateYear(2024)).not.toThrow();
      expect(() => validateYear(2000)).not.toThrow();
      expect(() => validateYear(2100)).not.toThrow();
    });

    test("小数はエラー", () => {
      expect(() => validateYear(2024.5)).toThrow(SettlementValidationError);
      expect(() => validateYear(2024.5)).toThrow("年は整数で入力してください");
    });

    test("範囲外はエラー", () => {
      expect(() => validateYear(1999)).toThrow(SettlementValidationError);
      expect(() => validateYear(2101)).toThrow(
        "年は2000〜2100の間で指定してください",
      );
    });
  });

  describe("validateMonth", () => {
    test("有効な月は通過する", () => {
      expect(() => validateMonth(1)).not.toThrow();
      expect(() => validateMonth(6)).not.toThrow();
      expect(() => validateMonth(12)).not.toThrow();
    });

    test("小数はエラー", () => {
      expect(() => validateMonth(6.5)).toThrow(SettlementValidationError);
      expect(() => validateMonth(6.5)).toThrow("月は整数で入力してください");
    });

    test("範囲外はエラー", () => {
      expect(() => validateMonth(0)).toThrow(SettlementValidationError);
      expect(() => validateMonth(13)).toThrow(
        "月は1〜12の間で指定してください",
      );
    });
  });

  describe("validateClosingDay", () => {
    test("有効な締め日は通過する", () => {
      expect(() => validateClosingDay(1)).not.toThrow();
      expect(() => validateClosingDay(15)).not.toThrow();
      expect(() => validateClosingDay(28)).not.toThrow();
    });

    test("小数はエラー", () => {
      expect(() => validateClosingDay(15.5)).toThrow(SettlementValidationError);
      expect(() => validateClosingDay(15.5)).toThrow(
        "締め日は整数で入力してください",
      );
    });

    test("範囲外はエラー", () => {
      expect(() => validateClosingDay(0)).toThrow(SettlementValidationError);
      expect(() => validateClosingDay(29)).toThrow(
        "締め日は1〜28の間で設定してください",
      );
    });
  });

  describe("validateSettlementPeriodInput", () => {
    test("有効な入力は通過する", () => {
      expect(() => validateSettlementPeriodInput(2024, 12)).not.toThrow();
      expect(() => validateSettlementPeriodInput(2025, 1)).not.toThrow();
    });

    test("年が不正な場合はエラー", () => {
      expect(() => validateSettlementPeriodInput(1999, 12)).toThrow(
        SettlementValidationError,
      );
    });

    test("月が不正な場合はエラー", () => {
      expect(() => validateSettlementPeriodInput(2024, 13)).toThrow(
        SettlementValidationError,
      );
    });
  });

  describe("SETTLEMENT_RULES", () => {
    test("定数が正しく定義されている", () => {
      expect(SETTLEMENT_RULES.MIN_CLOSING_DAY).toBe(1);
      expect(SETTLEMENT_RULES.MAX_CLOSING_DAY).toBe(28);
    });
  });
});

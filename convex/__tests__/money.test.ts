import { describe, expect, test } from "vitest";
import {
  divideWithRemainder,
  sumAmounts,
  isValidAmount,
} from "../domain/shared";

describe("shared/money", () => {
  describe("divideWithRemainder", () => {
    test("割り切れる場合", () => {
      const [base, remainder] = divideWithRemainder(900, 3);
      expect(base).toBe(300);
      expect(remainder).toBe(0);
    });

    test("端数がある場合", () => {
      const [base, remainder] = divideWithRemainder(1000, 3);
      expect(base).toBe(333);
      expect(remainder).toBe(1);
    });

    test("大きな金額でも正しく計算", () => {
      const [base, remainder] = divideWithRemainder(100_000_000, 3);
      expect(base).toBe(33_333_333);
      expect(remainder).toBe(1);
    });

    test("分割数1の場合", () => {
      const [base, remainder] = divideWithRemainder(1000, 1);
      expect(base).toBe(1000);
      expect(remainder).toBe(0);
    });

    test("分割数0以下はエラー", () => {
      expect(() => divideWithRemainder(1000, 0)).toThrow(
        "分割数は1以上である必要があります",
      );
      expect(() => divideWithRemainder(1000, -1)).toThrow(
        "分割数は1以上である必要があります",
      );
    });
  });

  describe("sumAmounts", () => {
    test("複数の金額を合計", () => {
      expect(sumAmounts([100, 200, 300])).toBe(600);
    });

    test("空配列は0", () => {
      expect(sumAmounts([])).toBe(0);
    });

    test("1つの要素", () => {
      expect(sumAmounts([500])).toBe(500);
    });
  });

  describe("isValidAmount", () => {
    test("範囲内の整数はtrue", () => {
      expect(isValidAmount(100, 1, 1000)).toBe(true);
      expect(isValidAmount(1, 1, 1000)).toBe(true);
      expect(isValidAmount(1000, 1, 1000)).toBe(true);
    });

    test("範囲外はfalse", () => {
      expect(isValidAmount(0, 1, 1000)).toBe(false);
      expect(isValidAmount(1001, 1, 1000)).toBe(false);
    });

    test("小数はfalse", () => {
      expect(isValidAmount(100.5, 1, 1000)).toBe(false);
    });
  });
});

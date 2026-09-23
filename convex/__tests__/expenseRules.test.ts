import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import {
  validateAmount,
  validateDate,
  validateTitle,
  validateMemo,
  validateExpenseInput,
  validateRatioSplit,
  validateAmountSplit,
  validateFullSplit,
  validateSplitDetails,
  ExpenseValidationError,
  EXPENSE_RULES,
} from "../domain/expense";
import type { Id } from "../_generated/dataModel";

const userA = "user_a" as Id<"users">;
const userB = "user_b" as Id<"users">;
const userC = "user_c" as Id<"users">;

describe("expense/rules", () => {
  describe("validateAmount", () => {
    test("有効な金額は通過する", () => {
      expect(() => validateAmount(0)).not.toThrow();
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

    test("負の金額はエラー", () => {
      expect(() => validateAmount(-1)).toThrow(ExpenseValidationError);
      expect(() => validateAmount(-100)).toThrow(
        "金額は0円から1億円の範囲で入力してください",
      );
    });

    test("1億円超はエラー", () => {
      expect(() => validateAmount(100_000_001)).toThrow(ExpenseValidationError);
      expect(() => validateAmount(100_000_001)).toThrow(
        "金額は0円から1億円の範囲で入力してください",
      );
    });
  });

  describe("validateDate", () => {
    test("有効な日付は通過する", () => {
      expect(() => validateDate("2024-12-30")).not.toThrow();
      expect(() => validateDate("2024-01-01")).not.toThrow();
      expect(() => validateDate("2023-12-31")).not.toThrow();
    });

    test("未来日も通過する", () => {
      expect(() => validateDate("2099-01-01")).not.toThrow();
      expect(() => validateDate("2099-12-31")).not.toThrow();
    });

    test("不正な形式はエラー", () => {
      expect(() => validateDate("2024/12/30")).toThrow(ExpenseValidationError);
      expect(() => validateDate("12-30-2024")).toThrow(
        "日付の形式が正しくありません",
      );
      expect(() => validateDate("invalid")).toThrow(ExpenseValidationError);
    });
  });

  describe("validateTitle", () => {
    test("undefinedはundefinedを返す", () => {
      expect(validateTitle(undefined)).toBeUndefined();
    });

    test("空文字はundefinedを返す", () => {
      expect(validateTitle("")).toBeUndefined();
    });

    test("空白のみはundefinedを返す", () => {
      expect(validateTitle("   ")).toBeUndefined();
    });

    test("有効なタイトルはトリムして返す", () => {
      expect(validateTitle("スーパーで買い物")).toBe("スーパーで買い物");
      expect(validateTitle("  スーパーで買い物  ")).toBe("スーパーで買い物");
    });

    test("100文字以内は通過する", () => {
      const title = "あ".repeat(100);
      expect(validateTitle(title)).toBe(title);
    });

    test("100文字超はエラー", () => {
      expect(() => validateTitle("あ".repeat(101))).toThrow(
        ExpenseValidationError,
      );
      expect(() => validateTitle("あ".repeat(101))).toThrow(
        "タイトルは100文字以内で入力してください",
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
          amount: -1,
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
      expect(EXPENSE_RULES.MIN_AMOUNT).toBe(0);
      expect(EXPENSE_RULES.MAX_AMOUNT).toBe(100_000_000);
      expect(EXPENSE_RULES.MAX_TITLE_LENGTH).toBe(100);
      expect(EXPENSE_RULES.MAX_MEMO_LENGTH).toBe(500);
      expect(EXPENSE_RULES.DATE_FORMAT_REGEX).toEqual(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("validateRatioSplit", () => {
    test("有効な割合は通過する", () => {
      expect(() =>
        validateRatioSplit(
          [
            { userId: userA, ratio: 60 },
            { userId: userB, ratio: 40 },
          ],
          [userA, userB],
        ),
      ).not.toThrow();
    });

    test("合計が100%でない場合はエラー", () => {
      expect(() =>
        validateRatioSplit(
          [
            { userId: userA, ratio: 60 },
            { userId: userB, ratio: 30 },
          ],
          [userA, userB],
        ),
      ).toThrow("割合の合計は100%である必要があります");
    });

    test("メンバーの割合が欠けている場合はエラー", () => {
      expect(() =>
        validateRatioSplit([{ userId: userA, ratio: 100 }], [userA, userB]),
      ).toThrow("全メンバーの割合を指定してください");
    });

    test("割合が負の値の場合はエラー", () => {
      expect(() =>
        validateRatioSplit(
          [
            { userId: userA, ratio: -10 },
            { userId: userB, ratio: 110 },
          ],
          [userA, userB],
        ),
      ).toThrow("割合は0〜100の整数で指定してください");
    });

    test("割合が101以上の場合はエラー", () => {
      expect(() =>
        validateRatioSplit(
          [
            { userId: userA, ratio: 101 },
            { userId: userB, ratio: -1 },
          ],
          [userA, userB],
        ),
      ).toThrow("割合は0〜100の整数で指定してください");
    });

    test("割合が小数の場合はエラー", () => {
      expect(() =>
        validateRatioSplit(
          [
            { userId: userA, ratio: 60.5 },
            { userId: userB, ratio: 39.5 },
          ],
          [userA, userB],
        ),
      ).toThrow("割合は0〜100の整数で指定してください");
    });
  });

  describe("validateAmountSplit", () => {
    test("有効な金額分割は通過する", () => {
      expect(() =>
        validateAmountSplit(
          [
            { userId: userA, amount: 600 },
            { userId: userB, amount: 400 },
          ],
          1000,
          [userA, userB],
        ),
      ).not.toThrow();
    });

    test("合計が支出金額と一致しない場合はエラー", () => {
      expect(() =>
        validateAmountSplit(
          [
            { userId: userA, amount: 600 },
            { userId: userB, amount: 300 },
          ],
          1000,
          [userA, userB],
        ),
      ).toThrow("金額の合計が支出金額と一致しません");
    });

    test("メンバーの金額が欠けている場合はエラー", () => {
      expect(() =>
        validateAmountSplit([{ userId: userA, amount: 1000 }], 1000, [
          userA,
          userB,
        ]),
      ).toThrow("全メンバーの金額を指定してください");
    });

    test("金額が負の値の場合はエラー", () => {
      expect(() =>
        validateAmountSplit(
          [
            { userId: userA, amount: -100 },
            { userId: userB, amount: 1100 },
          ],
          1000,
          [userA, userB],
        ),
      ).toThrow("金額は0以上の整数で指定してください");
    });
  });

  describe("validateFullSplit", () => {
    test("有効な全額負担は通過する", () => {
      expect(() => validateFullSplit(userA, [userA, userB])).not.toThrow();
    });

    test("負担者がメンバーにいない場合はエラー", () => {
      expect(() => validateFullSplit(userC, [userA, userB])).toThrow(
        "負担者はメンバーに含まれている必要があります",
      );
    });
  });

  describe("validateSplitDetails", () => {
    test("equal methodは常に通過する", () => {
      expect(() =>
        validateSplitDetails({ method: "equal" }, 1000, [userA, userB]),
      ).not.toThrow();
    });

    test("ratio methodは割合バリデーションを実行", () => {
      expect(() =>
        validateSplitDetails(
          {
            method: "ratio",
            ratios: [
              { userId: userA, ratio: 60 },
              { userId: userB, ratio: 40 },
            ],
          },
          1000,
          [userA, userB],
        ),
      ).not.toThrow();

      expect(() =>
        validateSplitDetails(
          {
            method: "ratio",
            ratios: [
              { userId: userA, ratio: 50 },
              { userId: userB, ratio: 40 },
            ],
          },
          1000,
          [userA, userB],
        ),
      ).toThrow("割合の合計は100%である必要があります");
    });

    test("amount methodは金額バリデーションを実行", () => {
      expect(() =>
        validateSplitDetails(
          {
            method: "amount",
            amounts: [
              { userId: userA, amount: 600 },
              { userId: userB, amount: 400 },
            ],
          },
          1000,
          [userA, userB],
        ),
      ).not.toThrow();

      expect(() =>
        validateSplitDetails(
          {
            method: "amount",
            amounts: [
              { userId: userA, amount: 600 },
              { userId: userB, amount: 300 },
            ],
          },
          1000,
          [userA, userB],
        ),
      ).toThrow("金額の合計が支出金額と一致しません");
    });

    test("full methodは全額負担バリデーションを実行", () => {
      expect(() =>
        validateSplitDetails({ method: "full", bearerId: userA }, 1000, [
          userA,
          userB,
        ]),
      ).not.toThrow();

      expect(() =>
        validateSplitDetails({ method: "full", bearerId: userC }, 1000, [
          userA,
          userB,
        ]),
      ).toThrow("負担者はメンバーに含まれている必要があります");
    });
  });
});

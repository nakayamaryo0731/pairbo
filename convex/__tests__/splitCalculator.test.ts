import { describe, expect, test } from "vitest";
import {
  calculateEqualSplit,
  calculateRatioSplit,
  calculateAmountSplit,
  calculateFullSplit,
} from "../domain/expense";
import type { Id } from "../_generated/dataModel";

// テスト用のモックID
const userA = "user_a" as Id<"users">;
const userB = "user_b" as Id<"users">;
const userC = "user_c" as Id<"users">;

describe("splitCalculator", () => {
  describe("calculateEqualSplit", () => {
    test("2人で1000円を均等分割", () => {
      const result = calculateEqualSplit(1000, [userA, userB], userA);

      expect(result.length).toBe(2);
      expect(result.find((r) => r.userId === userA)?.amount).toBe(500);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(500);
    });

    test("3人で1000円を均等分割（端数は支払者が負担）", () => {
      // 1000 ÷ 3 = 333余り1
      const result = calculateEqualSplit(1000, [userA, userB, userC], userA);

      expect(result.length).toBe(3);
      // 支払者（userA）が端数を負担
      expect(result.find((r) => r.userId === userA)?.amount).toBe(334);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(333);
      expect(result.find((r) => r.userId === userC)?.amount).toBe(333);

      // 合計が1000になることを確認
      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(1000);
    });

    test("3人で999円を均等分割（割り切れる）", () => {
      // 999 ÷ 3 = 333
      const result = calculateEqualSplit(999, [userA, userB, userC], userA);

      expect(result.every((r) => r.amount === 333)).toBe(true);

      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(999);
    });

    test("1人で1000円を均等分割", () => {
      const result = calculateEqualSplit(1000, [userA], userA);

      expect(result.length).toBe(1);
      expect(result[0].amount).toBe(1000);
    });

    test("支払者がメンバーリストの最後でも端数を負担", () => {
      const result = calculateEqualSplit(1000, [userA, userB, userC], userC);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(333);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(333);
      // 支払者（userC）が端数を負担
      expect(result.find((r) => r.userId === userC)?.amount).toBe(334);

      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(1000);
    });

    test("4人で1001円を均等分割（端数1円）", () => {
      // 1001 ÷ 4 = 250余り1
      const userD = "user_d" as Id<"users">;
      const result = calculateEqualSplit(
        1001,
        [userA, userB, userC, userD],
        userB,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(250);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(251); // 支払者
      expect(result.find((r) => r.userId === userC)?.amount).toBe(250);
      expect(result.find((r) => r.userId === userD)?.amount).toBe(250);

      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(1001);
    });

    test("メンバーが空の場合はエラー", () => {
      expect(() => calculateEqualSplit(1000, [], userA)).toThrow(
        "メンバーが指定されていません",
      );
    });

    test("0円は全員0円の分割になる", () => {
      const splits = calculateEqualSplit(0, [userA, userB], userA);
      expect(splits.every((s) => s.amount === 0)).toBe(true);
    });

    test("金額が負の場合はエラー", () => {
      expect(() => calculateEqualSplit(-100, [userA], userA)).toThrow(
        "金額は0円以上である必要があります",
      );
    });

    test("大きな金額でも正しく計算される", () => {
      const result = calculateEqualSplit(
        100_000_000,
        [userA, userB, userC],
        userA,
      );

      // 100,000,000 ÷ 3 = 33,333,333余り1
      expect(result.find((r) => r.userId === userA)?.amount).toBe(33_333_334);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(33_333_333);
      expect(result.find((r) => r.userId === userC)?.amount).toBe(33_333_333);

      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(100_000_000);
    });
  });

  describe("calculateRatioSplit", () => {
    test("2人で60:40の割合分割", () => {
      const result = calculateRatioSplit(
        1000,
        [
          { userId: userA, ratio: 60 },
          { userId: userB, ratio: 40 },
        ],
        userA,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(600);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(400);
    });

    test("端数が発生する場合、支払者が負担", () => {
      // 1001 * 60% = 600.6 → 600, 1001 * 40% = 400.4 → 400
      // 端数: 1001 - 600 - 400 = 1 → 支払者に加算
      const result = calculateRatioSplit(
        1001,
        [
          { userId: userA, ratio: 60 },
          { userId: userB, ratio: 40 },
        ],
        userA,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(601);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(400);

      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBe(1001);
    });

    test("支払者が後の方でも端数を負担", () => {
      const result = calculateRatioSplit(
        1001,
        [
          { userId: userA, ratio: 60 },
          { userId: userB, ratio: 40 },
        ],
        userB,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(600);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(401);
    });

    test("3人で割合分割", () => {
      const result = calculateRatioSplit(
        1000,
        [
          { userId: userA, ratio: 50 },
          { userId: userB, ratio: 30 },
          { userId: userC, ratio: 20 },
        ],
        userA,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(500);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(300);
      expect(result.find((r) => r.userId === userC)?.amount).toBe(200);
    });

    test("0%を含む場合", () => {
      const result = calculateRatioSplit(
        1000,
        [
          { userId: userA, ratio: 100 },
          { userId: userB, ratio: 0 },
        ],
        userA,
      );

      expect(result.find((r) => r.userId === userA)?.amount).toBe(1000);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(0);
    });

    test("合計が100%でない場合はエラー", () => {
      expect(() =>
        calculateRatioSplit(
          1000,
          [
            { userId: userA, ratio: 60 },
            { userId: userB, ratio: 30 },
          ],
          userA,
        ),
      ).toThrow("割合の合計は100%である必要があります");
    });

    test("空の割合リストはエラー", () => {
      expect(() => calculateRatioSplit(1000, [], userA)).toThrow(
        "割合が指定されていません",
      );
    });
  });

  describe("calculateAmountSplit", () => {
    test("金額指定で正しく分割", () => {
      const result = calculateAmountSplit([
        { userId: userA, amount: 700 },
        { userId: userB, amount: 300 },
      ]);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(700);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(300);
    });

    test("0円を含む場合", () => {
      const result = calculateAmountSplit([
        { userId: userA, amount: 1000 },
        { userId: userB, amount: 0 },
      ]);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(1000);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(0);
    });

    test("空の金額リストはエラー", () => {
      expect(() => calculateAmountSplit([])).toThrow(
        "金額が指定されていません",
      );
    });
  });

  describe("calculateFullSplit", () => {
    test("負担者が全額負担", () => {
      const result = calculateFullSplit(1000, [userA, userB], userA);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(1000);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(0);
    });

    test("負担者が2番目のメンバーの場合", () => {
      const result = calculateFullSplit(1000, [userA, userB], userB);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(0);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(1000);
    });

    test("3人で1人が全額負担", () => {
      const result = calculateFullSplit(1000, [userA, userB, userC], userB);

      expect(result.find((r) => r.userId === userA)?.amount).toBe(0);
      expect(result.find((r) => r.userId === userB)?.amount).toBe(1000);
      expect(result.find((r) => r.userId === userC)?.amount).toBe(0);
    });

    test("負担者がメンバーに含まれていない場合はエラー", () => {
      const userD = "user_d" as Id<"users">;
      expect(() => calculateFullSplit(1000, [userA, userB], userD)).toThrow(
        "負担者はメンバーに含まれている必要があります",
      );
    });

    test("メンバーが空の場合はエラー", () => {
      expect(() => calculateFullSplit(1000, [], userA)).toThrow(
        "メンバーが指定されていません",
      );
    });
  });
});

import { describe, expect, test } from "vitest";
import { calculateEqualSplit } from "../lib/splitCalculator";
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

    test("金額が0以下の場合はエラー", () => {
      expect(() => calculateEqualSplit(0, [userA], userA)).toThrow(
        "金額は1円以上である必要があります",
      );

      expect(() => calculateEqualSplit(-100, [userA], userA)).toThrow(
        "金額は1円以上である必要があります",
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
});

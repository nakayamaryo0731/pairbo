import { describe, it, expect } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  filterExpensesForMember,
  calcMemberTotals,
} from "@/components/settlements/MemberExpenseDetail";

const userA = "user_a" as Id<"users">;
const userB = "user_b" as Id<"users">;
const userC = "user_c" as Id<"users">;

function makeExpense(
  id: string,
  payerId: Id<"users">,
  amount: number,
  splits: { userId: Id<"users">; amount: number }[],
) {
  return {
    _id: id as Id<"expenses">,
    amount,
    date: "2025-01-15",
    splitMethod: "equal",
    category: null,
    payer: { _id: payerId, displayName: "payer" },
    splits: splits.map((s) => ({ ...s, displayName: "member" })),
  };
}

describe("filterExpensesForMember", () => {
  const expenses = [
    makeExpense("e1", userA, 1000, [
      { userId: userA, amount: 500 },
      { userId: userB, amount: 500 },
    ]),
    makeExpense("e2", userB, 2000, [
      { userId: userA, amount: 1000 },
      { userId: userB, amount: 1000 },
    ]),
    makeExpense("e3", userC, 600, [
      { userId: userC, amount: 300 },
      { userId: userB, amount: 300 },
    ]),
  ];

  it("支払者としての支出を含む", () => {
    const result = filterExpensesForMember(expenses, userA);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e._id)).toContain("e1");
    expect(result.map((e) => e._id)).toContain("e2");
  });

  it("負担者としての支出を含む", () => {
    const result = filterExpensesForMember(expenses, userB);
    expect(result).toHaveLength(3);
  });

  it("関わりのない支出は除外する", () => {
    const result = filterExpensesForMember(expenses, userC);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("e3");
  });

  it("空配列の場合は空配列を返す", () => {
    const result = filterExpensesForMember([], userA);
    expect(result).toHaveLength(0);
  });
});

describe("calcMemberTotals", () => {
  const expenses = [
    makeExpense("e1", userA, 1000, [
      { userId: userA, amount: 500 },
      { userId: userB, amount: 500 },
    ]),
    makeExpense("e2", userB, 2000, [
      { userId: userA, amount: 800 },
      { userId: userB, amount: 1200 },
    ]),
  ];

  it("支払い合計を正しく計算する", () => {
    const { totalPaid } = calcMemberTotals(expenses, userA);
    expect(totalPaid).toBe(1000);
  });

  it("負担合計を正しく計算する", () => {
    const { totalOwed } = calcMemberTotals(expenses, userA);
    expect(totalOwed).toBe(1300);
  });

  it("支払いがないメンバーのtotalPaidは0", () => {
    const { totalPaid } = calcMemberTotals(expenses, userC);
    expect(totalPaid).toBe(0);
  });

  it("負担がないメンバーのtotalOwedは0", () => {
    const { totalOwed } = calcMemberTotals(expenses, userC);
    expect(totalOwed).toBe(0);
  });

  it("空配列の場合は両方0", () => {
    const { totalPaid, totalOwed } = calcMemberTotals([], userA);
    expect(totalPaid).toBe(0);
    expect(totalOwed).toBe(0);
  });
});

"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { formatAmount } from "@/lib/formatters";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";

type Expense = {
  _id: Id<"expenses">;
  amount: number;
  date: string;
  title?: string;
  memo?: string;
  splitMethod: string;
  category: {
    _id: Id<"categories">;
    name: string;
    icon: string;
  } | null;
  payer: {
    _id: Id<"users">;
    displayName: string;
    avatarUrl?: string;
  } | null;
  splits: {
    userId: Id<"users">;
    displayName: string;
    amount: number;
  }[];
};

type MemberExpenseDetailProps = {
  memberId: Id<"users">;
  expenses: Expense[];
  memberColors?: Record<string, string>;
};

export function filterExpensesForMember(
  expenses: Expense[],
  memberId: Id<"users">,
) {
  return expenses.filter(
    (e) =>
      e.payer?._id === memberId || e.splits.some((s) => s.userId === memberId),
  );
}

export function calcMemberTotals(expenses: Expense[], memberId: Id<"users">) {
  let totalPaid = 0;
  let totalOwed = 0;
  for (const e of expenses) {
    if (e.payer?._id === memberId) {
      totalPaid += e.amount;
    }
    for (const s of e.splits) {
      if (s.userId === memberId) {
        totalOwed += s.amount;
      }
    }
  }
  return { totalPaid, totalOwed };
}

export function MemberExpenseDetail({
  memberId,
  expenses,
  memberColors,
}: MemberExpenseDetailProps) {
  const filtered = filterExpensesForMember(expenses, memberId);
  const { totalPaid, totalOwed } = calcMemberTotals(filtered, memberId);

  if (filtered.length === 0) {
    return (
      <div className="py-3 text-center text-sm text-slate-400">
        この期間の支出はありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs text-slate-500">
        <span>
          支払い:{" "}
          <span className="font-medium text-slate-700">
            ¥{formatAmount(totalPaid)}
          </span>
        </span>
        <span>
          負担:{" "}
          <span className="font-medium text-slate-700">
            ¥{formatAmount(totalOwed)}
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        {filtered.map((expense) => (
          <ExpenseCard
            key={expense._id}
            expense={expense}
            memberColors={memberColors}
          />
        ))}
      </div>
    </div>
  );
}

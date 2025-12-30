"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseCard } from "./ExpenseCard";

type Expense = {
  _id: Id<"expenses">;
  amount: number;
  date: string;
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
  createdAt: number;
};

type ExpenseListProps = {
  expenses: Expense[];
  onExpenseClick?: (expenseId: Id<"expenses">) => void;
};

/**
 * 日付から年月を取得（YYYY年M月）
 */
function getYearMonth(dateString: string): string {
  const [year, month] = dateString.split("-");
  return `${year}年${parseInt(month)}月`;
}

/**
 * 支出を年月でグループ化
 */
function groupByYearMonth(expenses: Expense[]): Map<string, Expense[]> {
  const grouped = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const yearMonth = getYearMonth(expense.date);
    const existing = grouped.get(yearMonth) ?? [];
    grouped.set(yearMonth, [...existing, expense]);
  }

  return grouped;
}

export function ExpenseList({ expenses, onExpenseClick }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="text-4xl mb-2">📝</div>
        <p>まだ支出がありません</p>
        <p className="text-sm mt-1">下の+ボタンから記録を始めましょう</p>
      </div>
    );
  }

  const grouped = groupByYearMonth(expenses);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([yearMonth, monthExpenses]) => (
        <div key={yearMonth}>
          {/* 月見出し */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-sm text-slate-500 font-medium px-2">
              {yearMonth}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* 支出リスト */}
          <div className="space-y-3">
            {monthExpenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onClick={() => onExpenseClick?.(expense._id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

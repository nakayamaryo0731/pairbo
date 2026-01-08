"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseCard } from "./ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type ExpenseForDelete = {
  _id: Id<"expenses">;
  amount: number;
  date: string;
  categoryIcon: string;
  categoryName: string;
};

type PeriodExpenseListProps = {
  groupId: Id<"groups">;
  year: number;
  month: number;
  onEdit?: (expenseId: Id<"expenses">) => void;
  onDelete?: (expense: ExpenseForDelete) => void;
};

export function PeriodExpenseList({
  groupId,
  year,
  month,
  onEdit,
  onDelete,
}: PeriodExpenseListProps) {
  const data = useQuery(api.expenses.listByPeriod, { groupId, year, month });

  if (data === undefined) {
    return <PeriodExpenseListSkeleton />;
  }

  if (data.expenses.length === 0) {
    return (
      <EmptyState
        emoji="📝"
        title="この期間の支出はありません"
        description="下の+ボタンから記録を始めましょう"
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* 支出リスト */}
      {data.expenses.map((expense) => (
        <ExpenseCard
          key={expense._id}
          expense={expense}
          onEdit={onEdit ? () => onEdit(expense._id) : undefined}
          onDelete={
            onDelete
              ? () =>
                  onDelete({
                    _id: expense._id,
                    amount: expense.amount,
                    date: expense.date,
                    categoryIcon: expense.category?.icon ?? "📦",
                    categoryName: expense.category?.name ?? "カテゴリなし",
                  })
              : undefined
          }
        />
      ))}
    </div>
  );
}

function PeriodExpenseListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

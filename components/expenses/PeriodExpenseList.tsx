"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseCard } from "./ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";

type PeriodExpenseListProps = {
  groupId: Id<"groups">;
  year: number;
  month: number;
  onExpenseClick?: (expenseId: Id<"expenses">) => void;
};

export function PeriodExpenseList({
  groupId,
  year,
  month,
  onExpenseClick,
}: PeriodExpenseListProps) {
  const data = useQuery(api.expenses.listByPeriod, { groupId, year, month });

  if (data === undefined) {
    return <PeriodExpenseListSkeleton />;
  }

  if (data.expenses.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="text-4xl mb-2">📝</div>
        <p>この期間の支出はありません</p>
        <p className="text-sm mt-1">下の+ボタンから記録を始めましょう</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 支出リスト */}
      {data.expenses.map((expense) => (
        <ExpenseCard
          key={expense._id}
          expense={expense}
          onClick={() => onExpenseClick?.(expense._id)}
        />
      ))}

      {/* サマリー */}
      <div className="text-center text-sm text-slate-500 pt-2">
        {data.totalCount}件 / 合計 ¥{data.totalAmount.toLocaleString()}
      </div>
    </div>
  );
}

function PeriodExpenseListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

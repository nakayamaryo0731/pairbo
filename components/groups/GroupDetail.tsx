"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PeriodExpenseList } from "@/components/expenses/PeriodExpenseList";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import {
  SettlementPreview,
  SettlementHistory,
  PeriodNavigator,
} from "@/components/settlements";
import { AnalyticsSection } from "@/components/analytics";

type TabType = "expenses" | "settlement" | "analytics";

type GroupDetailProps = {
  group: {
    _id: Id<"groups">;
    name: string;
    description?: string;
    closingDay: number;
  };
};

type ExpenseToDelete = {
  _id: Id<"expenses">;
  amount: number;
  date: string;
  categoryIcon: string;
  categoryName: string;
};

/**
 * 今日が含まれる精算期間の年月を計算
 */
function getCurrentSettlementYearMonth(closingDay: number): {
  year: number;
  month: number;
} {
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (today > closingDay) {
    if (currentMonth === 12) {
      return { year: currentYear + 1, month: 1 };
    }
    return { year: currentYear, month: currentMonth + 1 };
  }

  return { year: currentYear, month: currentMonth };
}

/**
 * 精算期間を計算
 */
function getSettlementPeriod(
  closingDay: number,
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const endDate = new Date(year, month - 1, closingDay);
  const startDate = new Date(year, month - 2, closingDay + 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export function GroupDetail({ group }: GroupDetailProps) {
  const router = useRouter();
  const removeExpense = useMutation(api.expenses.remove);

  // 今期の年月を初期値として設定
  const initialPeriod = useMemo(
    () => getCurrentSettlementYearMonth(group.closingDay),
    [group.closingDay],
  );

  const [displayYear, setDisplayYear] = useState(initialPeriod.year);
  const [displayMonth, setDisplayMonth] = useState(initialPeriod.month);
  const [activeTab, setActiveTab] = useState<TabType>("expenses");

  // 削除ダイアログ用の状態
  const [expenseToDelete, setExpenseToDelete] =
    useState<ExpenseToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 現在の精算期間
  const currentPeriod = useMemo(
    () => getCurrentSettlementYearMonth(group.closingDay),
    [group.closingDay],
  );

  // 表示中の期間
  const period = useMemo(
    () => getSettlementPeriod(group.closingDay, displayYear, displayMonth),
    [group.closingDay, displayYear, displayMonth],
  );

  // 翌月へ移動可能かどうか（今期より先には進めない）
  const canGoNext =
    displayYear < currentPeriod.year ||
    (displayYear === currentPeriod.year && displayMonth < currentPeriod.month);

  const goToPreviousMonth = () => {
    if (displayMonth === 1) {
      setDisplayYear(displayYear - 1);
      setDisplayMonth(12);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;

    if (displayMonth === 12) {
      setDisplayYear(displayYear + 1);
      setDisplayMonth(1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const handleEdit = (expenseId: Id<"expenses">) => {
    router.push(`/groups/${group._id}/expenses/${expenseId}/edit`);
  };

  const handleDelete = (expense: ExpenseToDelete) => {
    setExpenseToDelete(expense);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;

    setIsDeleting(true);
    try {
      await removeExpense({ expenseId: expenseToDelete._id });
      setExpenseToDelete(null);
    } catch (error) {
      console.error("削除エラー:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 固定ナビゲーション（期間 + タブ） */}
      <div className="sticky top-17.25 z-10 -mx-4 px-4 pb-2 bg-white border-b border-slate-200">
        {/* 期間ナビゲーター */}
        <div className="pt-4">
          <PeriodNavigator
            year={displayYear}
            month={displayMonth}
            startDate={period.startDate}
            endDate={period.endDate}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            canGoNext={canGoNext}
          />
        </div>

        {/* タブ */}
        <div className="flex mt-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "expenses"}
            onClick={() => setActiveTab("expenses")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "expenses"
                ? "text-slate-800 border-b-2 border-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            支出
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "settlement"}
            onClick={() => setActiveTab("settlement")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "settlement"
                ? "text-slate-800 border-b-2 border-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            精算
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "analytics"}
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "analytics"
                ? "text-slate-800 border-b-2 border-slate-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            分析
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      {activeTab === "expenses" && (
        <div>
          <PeriodExpenseList
            groupId={group._id}
            year={displayYear}
            month={displayMonth}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {activeTab === "settlement" && (
        <div className="space-y-6">
          <div>
            <h2 className="font-medium text-slate-800 mb-3">今期の精算</h2>
            <SettlementPreview
              groupId={group._id}
              year={displayYear}
              month={displayMonth}
            />
          </div>
          <div>
            <h2 className="font-medium text-slate-800 mb-3">過去の精算</h2>
            <SettlementHistory groupId={group._id} />
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <AnalyticsSection
          groupId={group._id}
          year={displayYear}
          month={displayMonth}
        />
      )}

      {/* 支出記録ボタン */}
      <div className="fixed bottom-6 right-6">
        <Link
          href={`/groups/${group._id}/expenses/new`}
          className="w-14 h-14 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
          aria-label="支出を記録"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </Link>
      </div>

      {/* 削除確認ダイアログ */}
      {expenseToDelete && (
        <DeleteExpenseDialog
          open={!!expenseToDelete}
          onOpenChange={(open) => !open && setExpenseToDelete(null)}
          expense={{
            categoryIcon: expenseToDelete.categoryIcon,
            categoryName: expenseToDelete.categoryName,
            amount: expenseToDelete.amount,
            date: expenseToDelete.date,
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

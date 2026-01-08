"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePeriodNavigation } from "@/hooks";
import { PeriodExpenseList, DeleteExpenseDialog } from "@/components/expenses";
import {
  SettlementPreview,
  SettlementHistory,
  PeriodNavigator,
} from "@/components/settlements";
import { TabNavigation } from "@/components/ui/TabNavigation";
import { FAB } from "@/components/ui/FAB";
import { AdBanner } from "@/components/ads";
import { ClipboardList, Coins, Plus } from "lucide-react";

type TabType = "expenses" | "settlement";

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

export function GroupDetail({ group }: GroupDetailProps) {
  const router = useRouter();
  const removeExpense = useMutation(api.expenses.remove);

  // 期間ナビゲーション
  const {
    year: displayYear,
    month: displayMonth,
    goToPreviousMonth,
    goToNextMonth,
    canGoNextMonth: canGoNext,
    period,
  } = usePeriodNavigation({ closingDay: group.closingDay });

  const [activeTab, setActiveTab] = useState<TabType>("expenses");

  // 支出サマリー取得（固定表示用）
  const expenseData = useQuery(api.expenses.listByPeriod, {
    groupId: group._id,
    year: displayYear,
    month: displayMonth,
  });

  // 削除ダイアログ用の状態
  const [expenseToDelete, setExpenseToDelete] =
    useState<ExpenseToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // キーボードショートカット（左右矢印でタブ切り替え）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 入力中は無視
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setActiveTab("expenses");
      } else if (e.key === "ArrowRight") {
        setActiveTab("settlement");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEdit = (expenseId: Id<"expenses">) => {
    router.push(`/groups/${group._id}/expenses/${expenseId}`);
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
    <div className="flex h-full flex-col">
      {/* 固定ヘッダー（期間ナビ + サマリー） */}
      <div className="shrink-0 bg-white border-b border-slate-200">
        <div className="px-4 py-4">
          <PeriodNavigator
            year={displayYear}
            month={displayMonth}
            startDate={period!.startDate}
            endDate={period!.endDate}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            canGoNext={canGoNext}
          />
        </div>
        {/* 支出サマリー（支出タブ時のみ表示） */}
        {activeTab === "expenses" && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100">
            <span className="text-sm text-slate-600">
              {expenseData?.totalCount ?? 0}件の支出
            </span>
            <span className="text-lg font-semibold text-slate-800">
              ¥{(expenseData?.totalAmount ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* スクロール可能なコンテンツ領域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-40">
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
      </div>

      {/* 支出記録ボタン（FAB） */}
      <FAB
        href={`/groups/${group._id}/expenses/new`}
        icon={<Plus />}
        label="支出を記録"
      />

      {/* 広告バナー（TabNavigationの上） */}
      <AdBanner aboveTabNav skipPageCheck />

      {/* 下部タブナビゲーション */}
      <TabNavigation
        tabs={[
          { id: "expenses", label: "支出", icon: <ClipboardList /> },
          { id: "settlement", label: "精算", icon: <Coins /> },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as TabType)}
      />

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

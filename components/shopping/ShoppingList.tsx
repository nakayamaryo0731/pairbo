"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ShoppingItemInput } from "./ShoppingItemInput";
import { ShoppingItem } from "./ShoppingItem";
import { ShoppingHistory } from "./ShoppingHistory";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { History, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

type ShoppingListProps = {
  groupId: Id<"groups">;
};

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function ShoppingList({ groupId }: ShoppingListProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyYear, setHistoryYear] = useState(
    () => getCurrentYearMonth().year,
  );
  const [historyMonth, setHistoryMonth] = useState(
    () => getCurrentYearMonth().month,
  );

  const pending = useQuery(api.shoppingList.list, { groupId });
  const purchased = useQuery(
    api.shoppingList.listPurchasedByMonth,
    showHistory ? { groupId, year: historyYear, month: historyMonth } : "skip",
  );

  const currentYearMonth = getCurrentYearMonth();
  const canGoNext =
    historyYear < currentYearMonth.year ||
    (historyYear === currentYearMonth.year &&
      historyMonth < currentYearMonth.month);

  const goToPreviousMonth = () => {
    if (historyMonth === 1) {
      setHistoryYear(historyYear - 1);
      setHistoryMonth(12);
    } else {
      setHistoryMonth(historyMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    if (historyMonth === 12) {
      setHistoryYear(historyYear + 1);
      setHistoryMonth(1);
    } else {
      setHistoryMonth(historyMonth + 1);
    }
  };

  if (pending === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        backHref={`/groups/${groupId}`}
        title={showHistory ? "購入履歴" : "買い物リスト"}
        rightElement={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className={showHistory ? "text-blue-600" : "text-slate-600"}
            aria-label={showHistory ? "リストを表示" : "履歴を表示"}
          >
            {showHistory ? (
              <ShoppingCart className="h-5 w-5" />
            ) : (
              <History className="h-5 w-5" />
            )}
          </Button>
        }
      />

      {/* メインコンテンツ */}
      <main className="p-4 space-y-4">
        {showHistory ? (
          <>
            {/* 月別ナビゲーター */}
            <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                aria-label="前月"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-medium">
                {historyYear}年{historyMonth}月
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                disabled={!canGoNext}
                aria-label="翌月"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {purchased === undefined ? (
              <div className="text-center py-8 text-slate-500">
                読み込み中...
              </div>
            ) : (
              <ShoppingHistory items={purchased} />
            )}
          </>
        ) : (
          <>
            {/* アイテム一覧 */}
            {pending.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>買い物リストは空です</p>
                <p className="text-sm mt-1">
                  下の入力欄からアイテムを追加しましょう
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200">
                {pending.map((item) => (
                  <ShoppingItem key={item._id} item={item} mode="pending" />
                ))}
              </div>
            )}

            {/* アイテム数 */}
            {pending.length > 0 && (
              <p className="text-sm text-slate-500 text-center pb-16">
                {pending.length}件のアイテム
              </p>
            )}

            {/* 下部スペーサー（入力欄が隠れないように） */}
            {pending.length === 0 && <div className="h-16" />}
          </>
        )}
      </main>

      {/* 下部固定の入力欄（リスト表示時のみ） */}
      {!showHistory && (
        <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-slate-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto">
            <ShoppingItemInput groupId={groupId} />
          </div>
        </div>
      )}
    </div>
  );
}

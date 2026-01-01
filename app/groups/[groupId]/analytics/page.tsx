"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryPieChart } from "@/components/analytics/CategoryPieChart";
import { MonthlyTrendChart } from "@/components/analytics/MonthlyTrendChart";
import { ChartSkeleton } from "@/components/analytics/ChartSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateISO, formatPeriod } from "@/lib/formatters";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

type ViewType = "month" | "year";

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
  const endDate = new Date(year, month - 1, closingDay);
  const startDate = new Date(year, month - 2, closingDay + 1);

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
  };
}

export default function AnalyticsPage({ params }: PageProps) {
  const { groupId } = use(params);
  const [viewType, setViewType] = useState<ViewType>("month");

  const group = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  // 現在の精算期間を計算
  const currentPeriod = useMemo(() => {
    if (!group)
      return {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      };
    return getCurrentSettlementYearMonth(group.group.closingDay);
  }, [group]);

  // 月次表示用の年月
  const [displayYear, setDisplayYear] = useState<number | null>(null);
  const [displayMonth, setDisplayMonth] = useState<number | null>(null);

  // 年次表示用の年
  const [displayYearForYearly, setDisplayYearForYearly] = useState<
    number | null
  >(null);

  // 実際に使用する年月（初期値はcurrentPeriod）
  const activeYear = displayYear ?? currentPeriod.year;
  const activeMonth = displayMonth ?? currentPeriod.month;
  const activeYearForYearly = displayYearForYearly ?? currentPeriod.year;

  // 月次ナビゲーション
  const canGoNextMonth =
    activeYear < currentPeriod.year ||
    (activeYear === currentPeriod.year && activeMonth < currentPeriod.month);

  const goToPreviousMonth = () => {
    if (activeMonth === 1) {
      setDisplayYear(activeYear - 1);
      setDisplayMonth(12);
    } else {
      setDisplayYear(activeYear);
      setDisplayMonth(activeMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNextMonth) return;
    if (activeMonth === 12) {
      setDisplayYear(activeYear + 1);
      setDisplayMonth(1);
    } else {
      setDisplayYear(activeYear);
      setDisplayMonth(activeMonth + 1);
    }
  };

  // キーボードショートカット（左右矢印で月次/年次切り替え）
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
        setViewType("month");
      } else if (e.key === "ArrowRight") {
        setViewType("year");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 年次ナビゲーション
  const canGoNextYear = activeYearForYearly < currentPeriod.year;

  const goToPreviousYear = () => {
    setDisplayYearForYearly(activeYearForYearly - 1);
  };

  const goToNextYear = () => {
    if (!canGoNextYear) return;
    setDisplayYearForYearly(activeYearForYearly + 1);
  };

  // 表示中の期間
  const period = useMemo(() => {
    if (!group) return { startDate: "", endDate: "" };
    return getSettlementPeriod(group.group.closingDay, activeYear, activeMonth);
  }, [group, activeYear, activeMonth]);

  // 月次データ
  const monthlyCategory = useQuery(
    api.analytics.getCategoryBreakdown,
    group
      ? {
          groupId: groupId as Id<"groups">,
          year: activeYear,
          month: activeMonth,
        }
      : "skip",
  );

  // 年次データ
  const yearlyCategory = useQuery(
    api.analytics.getYearlyCategoryBreakdown,
    group
      ? {
          groupId: groupId as Id<"groups">,
          year: activeYearForYearly,
        }
      : "skip",
  );

  const yearlyTrend = useQuery(
    api.analytics.getMonthlyTrend,
    group
      ? {
          groupId: groupId as Id<"groups">,
          year: activeYearForYearly,
          month: 12,
          months: 12,
        }
      : "skip",
  );

  if (group === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader backHref={`/groups/${groupId}`} isLoading />
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto space-y-6">
            <ChartSkeleton type="pie" />
            <ChartSkeleton type="bar" />
          </div>
        </main>
      </div>
    );
  }

  const categoryData = viewType === "month" ? monthlyCategory : yearlyCategory;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader backHref={`/groups/${groupId}`} title="分析" />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* 月/年切り替えタブ */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewType("month")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "month"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              月次
            </button>
            <button
              onClick={() => setViewType("year")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === "year"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              年次
            </button>
          </div>

          {/* 期間ナビゲーター */}
          {viewType === "month" ? (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                aria-label="前の月へ"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="font-medium text-slate-800">
                  {activeYear}年{activeMonth}月分
                </div>
                <div className="text-sm text-slate-500">
                  {formatPeriod(period.startDate, period.endDate)}
                </div>
              </div>
              <button
                onClick={goToNextMonth}
                disabled={!canGoNextMonth}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="次の月へ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
              <button
                onClick={goToPreviousYear}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                aria-label="前の年へ"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="font-medium text-slate-800">
                  {activeYearForYearly}年
                </div>
                <div className="text-sm text-slate-500">1月〜12月</div>
              </div>
              <button
                onClick={goToNextYear}
                disabled={!canGoNextYear}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="次の年へ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* カテゴリ別円グラフ */}
          <section>
            <h3 className="text-sm font-medium text-slate-700 mb-3">
              カテゴリ別支出
            </h3>
            {categoryData === undefined ? (
              <ChartSkeleton type="pie" />
            ) : (
              <CategoryPieChart
                data={categoryData.breakdown}
                totalAmount={categoryData.totalAmount}
              />
            )}
          </section>

          {/* 推移グラフ（年次のみ） */}
          {viewType === "year" && (
            <section>
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                月別推移
              </h3>
              {yearlyTrend === undefined ? (
                <ChartSkeleton type="bar" />
              ) : (
                <MonthlyTrendChart data={yearlyTrend.trend} />
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

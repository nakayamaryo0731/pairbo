"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePeriodNavigation } from "@/hooks";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { CategoryPieChart } from "@/components/analytics/CategoryPieChart";
import { MonthlyTrendChart } from "@/components/analytics/MonthlyTrendChart";
import { TagBreakdownChart } from "@/components/analytics/TagBreakdownChart";
import { ChartSkeleton } from "@/components/analytics/ChartSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatPeriod } from "@/lib/formatters";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

type ViewType = "month" | "year";

export default function AnalyticsPage({ params }: PageProps) {
  const { groupId } = use(params);
  const { isAuthenticated } = useConvexAuth();
  const [viewType, setViewType] = useState<ViewType>("month");

  const group = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });
  const subscription = useQuery(
    api.subscriptions.getMySubscription,
    isAuthenticated ? {} : "skip",
  );

  const isPremium = subscription?.plan === "premium";

  // 月次ナビゲーション（精算期間ベース）
  const {
    year: activeYear,
    month: activeMonth,
    goToPreviousMonth,
    goToNextMonth,
    canGoNextMonth,
    period,
    currentPeriod,
  } = usePeriodNavigation({
    closingDay: group?.group.closingDay,
  });

  // 年次表示用の年（月次とは独立して管理）
  const [displayYearForYearly, setDisplayYearForYearly] = useState<
    number | null
  >(null);
  const activeYearForYearly = displayYearForYearly ?? currentPeriod.year;

  // 年次ナビゲーション（独立）
  const canGoNextYearForYearly = activeYearForYearly < currentPeriod.year;

  const goToPreviousYearForYearly = () => {
    setDisplayYearForYearly(activeYearForYearly - 1);
  };

  const goToNextYearForYearly = () => {
    if (!canGoNextYearForYearly) return;
    setDisplayYearForYearly(activeYearForYearly + 1);
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
        if (isPremium) setViewType("year");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPremium]);

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

  // 月次タグ別データ（Premium）
  const monthlyTagBreakdown = useQuery(
    api.analytics.getTagBreakdown,
    group && isPremium
      ? {
          groupId: groupId as Id<"groups">,
          year: activeYear,
          month: activeMonth,
        }
      : "skip",
  );

  // 年次タグ別データ（Premium）
  const yearlyTagBreakdown = useQuery(
    api.analytics.getYearlyTagBreakdown,
    group && isPremium
      ? {
          groupId: groupId as Id<"groups">,
          year: activeYearForYearly,
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
  const tagData =
    viewType === "month" ? monthlyTagBreakdown : yearlyTagBreakdown;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader backHref={`/groups/${groupId}`} title="分析" />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* 月次/年次 切り替えタブ */}
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
              onClick={() => isPremium && setViewType("year")}
              disabled={!isPremium}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
                viewType === "year"
                  ? "bg-white text-slate-800 shadow-sm"
                  : isPremium
                    ? "text-slate-500 hover:text-slate-700"
                    : "text-slate-400 cursor-not-allowed"
              }`}
            >
              年次
              {!isPremium && <Lock className="h-3 w-3" />}
            </button>
          </div>

          {/* Premiumへの誘導 */}
          {!isPremium && (
            <p className="text-xs text-slate-500 text-center">
              <Link href="/pricing" className="text-blue-600 hover:underline">
                Premiumプラン
              </Link>
              で年次分析・タグ別分析が利用可能
            </p>
          )}

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
                  {period && formatPeriod(period.startDate, period.endDate)}
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
                onClick={goToPreviousYearForYearly}
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
                onClick={goToNextYearForYearly}
                disabled={!canGoNextYearForYearly}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="次の年へ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* カテゴリ別支出 */}
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

          {/* タグ別支出（Premium） */}
          {isPremium && (
            <section>
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                タグ別支出
              </h3>
              {tagData === undefined ? (
                <ChartSkeleton type="pie" />
              ) : (
                <TagBreakdownChart
                  data={tagData.breakdown}
                  totalAmount={tagData.totalAmount}
                  untaggedAmount={tagData.untaggedAmount}
                />
              )}
            </section>
          )}

          {/* タグ別へのPremium誘導（非Premium） */}
          {!isPremium && (
            <section>
              <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1">
                タグ別支出
                <Lock className="h-3 w-3 text-slate-400" />
              </h3>
              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500">
                  <Link
                    href="/pricing"
                    className="text-blue-600 hover:underline"
                  >
                    Premiumプラン
                  </Link>
                  でタグ機能が利用可能
                </p>
              </div>
            </section>
          )}

          {/* 月別推移（年次のみ） */}
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

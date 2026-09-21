"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ClosingDay } from "@/convex/domain/group/types";
import { usePeriodNavigation, useGroupPremium } from "@/hooks";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/analytics/ChartSkeleton";
import { formatPeriod } from "@/lib/formatters";
import { trackEvent } from "@/lib/analytics";
import { ExportButton } from "@/components/settings";

const CategoryPieChart = dynamic(
  () =>
    import("@/components/analytics/CategoryPieChart").then(
      (m) => m.CategoryPieChart,
    ),
  { loading: () => <ChartSkeleton type="pie" /> },
);
const MonthlyTrendChart = dynamic(
  () =>
    import("@/components/analytics/MonthlyTrendChart").then(
      (m) => m.MonthlyTrendChart,
    ),
  { loading: () => <ChartSkeleton type="bar" /> },
);
const TagBreakdownChart = dynamic(
  () =>
    import("@/components/analytics/TagBreakdownChart").then(
      (m) => m.TagBreakdownChart,
    ),
  { loading: () => <ChartSkeleton type="pie" /> },
);

type ViewType = "month" | "year" | "all";

type AnalyticsContentProps = {
  groupId: string;
  closingDay?: ClosingDay;
};

export function AnalyticsContent({
  groupId,
  closingDay,
}: AnalyticsContentProps) {
  const [viewType, setViewType] = useState<ViewType>("month");
  const router = useRouter();

  const { isPremium } = useGroupPremium(groupId as Id<"groups">);

  useEffect(() => {
    trackEvent("view_analytics");
  }, []);

  const {
    year: activeYear,
    month: activeMonth,
    goToPreviousMonth,
    goToNextMonth,
    period,
    currentPeriod,
  } = usePeriodNavigation({ closingDay });

  const [displayYearForYearly, setDisplayYearForYearly] = useState<
    number | null
  >(null);
  const activeYearForYearly = displayYearForYearly ?? currentPeriod.year;

  const goToPreviousYearForYearly = () =>
    setDisplayYearForYearly(activeYearForYearly - 1);
  const goToNextYearForYearly = () =>
    setDisplayYearForYearly(activeYearForYearly + 1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft") setViewType("month");
      else if (e.key === "ArrowRight" && isPremium) setViewType("year");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPremium]);

  const gid = groupId as Id<"groups">;

  const monthlyCategory = useQuery(
    api.analytics.getCategoryBreakdown,
    viewType === "month"
      ? { groupId: gid, year: activeYear, month: activeMonth }
      : "skip",
  );
  const yearlyCategory = useQuery(
    api.analytics.getYearlyCategoryBreakdown,
    viewType === "year" ? { groupId: gid, year: activeYearForYearly } : "skip",
  );
  const yearlyTrend = useQuery(
    api.analytics.getMonthlyTrend,
    viewType === "year"
      ? { groupId: gid, year: activeYearForYearly, month: 12, months: 12 }
      : "skip",
  );
  const monthlyTagBreakdown = useQuery(
    api.analytics.getTagBreakdown,
    isPremium && viewType === "month"
      ? { groupId: gid, year: activeYear, month: activeMonth }
      : "skip",
  );
  const yearlyTagBreakdown = useQuery(
    api.analytics.getYearlyTagBreakdown,
    isPremium && viewType === "year"
      ? { groupId: gid, year: activeYearForYearly }
      : "skip",
  );
  const allTimeCategory = useQuery(
    api.analytics.getAllTimeCategoryBreakdown,
    isPremium && viewType === "all" ? { groupId: gid } : "skip",
  );
  const allTimeTagBreakdown = useQuery(
    api.analytics.getAllTimeTagBreakdown,
    isPremium && viewType === "all" ? { groupId: gid } : "skip",
  );

  const categoryData =
    viewType === "month"
      ? monthlyCategory
      : viewType === "year"
        ? yearlyCategory
        : allTimeCategory;
  const tagData =
    viewType === "month"
      ? monthlyTagBreakdown
      : viewType === "year"
        ? yearlyTagBreakdown
        : allTimeTagBreakdown;

  const handleCategoryClick = (categoryId: Id<"categories">) => {
    const params = new URLSearchParams();
    params.set("category", categoryId);
    if (viewType === "month") {
      params.set("year", activeYear.toString());
      params.set("month", activeMonth.toString());
    } else if (viewType === "year") {
      params.set("year", activeYearForYearly.toString());
    } else {
      params.set("all", "true");
    }
    router.push(`/groups/${groupId}/expenses?${params.toString()}`);
  };

  const handleTagClick = (tagId: Id<"tags"> | "untagged") => {
    const params = new URLSearchParams();
    params.set("tag", tagId);
    if (viewType === "month") {
      params.set("year", activeYear.toString());
      params.set("month", activeMonth.toString());
    } else if (viewType === "year") {
      params.set("year", activeYearForYearly.toString());
    } else {
      params.set("all", "true");
    }
    router.push(`/groups/${groupId}/expenses?${params.toString()}`);
  };

  return (
    <div className="p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* 月次/年次/全期間 切り替えタブ */}
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
            onClick={() => {
              if (isPremium) {
                setViewType("year");
              } else {
                trackEvent("premium_gate_hit", { feature: "yearly_analytics" });
              }
            }}
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
          <button
            onClick={() => {
              if (isPremium) {
                setViewType("all");
              } else {
                trackEvent("premium_gate_hit", { feature: "yearly_analytics" });
              }
            }}
            disabled={!isPremium}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1 ${
              viewType === "all"
                ? "bg-white text-slate-800 shadow-sm"
                : isPremium
                  ? "text-slate-500 hover:text-slate-700"
                  : "text-slate-400 cursor-not-allowed"
            }`}
          >
            全期間
            {!isPremium && <Lock className="h-3 w-3" />}
          </button>
        </div>

        {!isPremium && (
          <p className="text-xs text-slate-500 text-center">
            <Link href="/pricing" className="text-blue-600 hover:underline">
              Premiumプラン
            </Link>
            で年次分析・全期間分析・タグ別分析が利用可能
          </p>
        )}

        {/* 期間ナビゲーター */}
        {viewType === "month" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-between bg-slate-50 rounded-lg p-3">
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
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                aria-label="次の月へ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <ExportButton
              groupId={gid}
              initialPeriod={{
                type: "settlement",
                year: activeYear,
                month: activeMonth,
              }}
            />
          </div>
        )}
        {viewType === "year" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-between bg-slate-50 rounded-lg p-3">
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
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                aria-label="次の年へ"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <ExportButton
              groupId={gid}
              initialPeriod={{ type: "year", year: activeYearForYearly }}
            />
          </div>
        )}
        {viewType === "all" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-lg p-3">
              <div className="text-center">
                <div className="font-medium text-slate-800">全期間</div>
                <div className="text-sm text-slate-500">
                  {allTimeCategory?.periodLabel ?? "データなし"}
                </div>
              </div>
            </div>
            <ExportButton groupId={gid} initialPeriod={{ type: "all" }} />
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
              onCategoryClick={handleCategoryClick}
            />
          )}
        </section>

        {/* タグ別支出 */}
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
                onTagClick={handleTagClick}
              />
            )}
          </section>
        )}
        {!isPremium && (
          <section>
            <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1">
              タグ別支出
              <Lock className="h-3 w-3 text-slate-400" />
            </h3>
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">
                <Link href="/pricing" className="text-blue-600 hover:underline">
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
    </div>
  );
}

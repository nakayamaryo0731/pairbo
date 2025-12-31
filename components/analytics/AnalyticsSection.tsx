"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CategoryPieChart } from "./CategoryPieChart";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { ChartSkeleton } from "./ChartSkeleton";

type AnalyticsSectionProps = {
  groupId: Id<"groups">;
  year: number;
  month: number;
};

export function AnalyticsSection({
  groupId,
  year,
  month,
}: AnalyticsSectionProps) {
  const categoryBreakdown = useQuery(api.analytics.getCategoryBreakdown, {
    groupId,
    year,
    month,
  });

  const monthlyTrend = useQuery(api.analytics.getMonthlyTrend, {
    groupId,
    year,
    month,
    months: 6,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* カテゴリ別円グラフ */}
      <section className="bg-card rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-4">カテゴリ別支出</h3>
        {categoryBreakdown === undefined ? (
          <ChartSkeleton type="pie" />
        ) : (
          <CategoryPieChart
            data={categoryBreakdown.breakdown}
            totalAmount={categoryBreakdown.totalAmount}
          />
        )}
      </section>

      {/* 月別推移グラフ */}
      <section className="bg-card rounded-lg border p-4">
        <h3 className="text-sm font-medium mb-4">月別推移</h3>
        {monthlyTrend === undefined ? (
          <ChartSkeleton type="bar" />
        ) : (
          <MonthlyTrendChart data={monthlyTrend.trend} />
        )}
      </section>
    </div>
  );
}

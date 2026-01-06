"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Id } from "@/convex/_generated/dataModel";

const CHART_COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#ea580c", // orange-600
  "#9333ea", // purple-600
  "#e11d48", // rose-600
  "#0891b2", // cyan-600
  "#ca8a04", // yellow-600
  "#4f46e5", // indigo-600
];

type CategoryBreakdown = {
  categoryId: Id<"categories">;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
};

type CategoryPieChartProps = {
  data: CategoryBreakdown[];
  totalAmount: number;
};

export function CategoryPieChart({ data, totalAmount }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-slate-500">
        この期間のデータがありません
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-xl p-4">
      {/* 円グラフ + 凡例 横並び（50/50分割） */}
      <div className="flex">
        {/* 円グラフ（左半分） */}
        <div className="w-1/2 flex items-center justify-center">
          <div className="w-44 h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `¥${Number(value).toLocaleString()}`,
                    "金額",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* 中央に合計金額 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400">合計</span>
              <span className="text-sm font-semibold text-slate-700">
                ¥{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 凡例（右半分） */}
        <div className="w-1/2 flex items-center justify-center">
          <div className="max-h-44 overflow-y-auto">
            <div className="space-y-1">
              {chartData.map((item) => (
                <div
                  key={item.categoryId}
                  className="flex items-center gap-1.5 text-sm"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="shrink-0">{item.categoryIcon}</span>
                  <span className="truncate max-w-[4rem] text-slate-700">
                    {item.categoryName}
                  </span>
                  <span className="font-medium text-slate-800 ml-auto pl-3 tabular-nums">
                    ¥{item.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 w-10 text-right tabular-nums">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

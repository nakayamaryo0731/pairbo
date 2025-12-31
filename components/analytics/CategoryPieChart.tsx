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
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>この期間の支出データがありません</p>
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="categoryName"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
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
      </div>

      <div className="flex flex-col gap-2">
        {chartData.map((item) => (
          <div key={item.categoryId} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.fill }}
            />
            <span className="shrink-0">{item.categoryIcon}</span>
            <span className="flex-1 truncate text-sm">{item.categoryName}</span>
            <span className="text-sm font-medium">
              ¥{item.amount.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">合計</span>
          <span className="text-lg font-bold">
            ¥{totalAmount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Id } from "@/convex/_generated/dataModel";
import { getTagColorHex, getTagColorClasses } from "@/lib/tagColors";

type TagBreakdownData = {
  tagId: Id<"tags">;
  tagName: string;
  tagColor: string;
  amount: number;
  percentage: number;
  count: number;
};

type TagBreakdownChartProps = {
  data: TagBreakdownData[];
  totalAmount: number;
  untaggedAmount: number;
  onTagClick?: (tagId: Id<"tags"> | "untagged") => void;
};

export function TagBreakdownChart({
  data,
  totalAmount,
  untaggedAmount,
  onTagClick,
}: TagBreakdownChartProps) {
  if (totalAmount === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-slate-500">
        この期間のデータがありません
      </div>
    );
  }

  // チャートデータを構築
  const chartData: {
    name: string;
    amount: number;
    fill: string;
    tagId: Id<"tags"> | "untagged";
  }[] = data.map((item) => ({
    name: `#${item.tagName}`,
    amount: item.amount,
    fill: getTagColorHex(item.tagColor),
    tagId: item.tagId,
  }));

  // タグなし支出を追加
  if (untaggedAmount > 0) {
    chartData.push({
      name: "タグなし",
      amount: untaggedAmount,
      fill: "#94a3b8", // slate-400
      tagId: "untagged",
    });
  }

  return (
    <div className="bg-white rounded-xl p-6 space-y-6">
      {/* 円グラフ */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={chartData.length > 1 ? 2 : 0}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    onClick={() => onTagClick?.(entry.tagId)}
                    style={{ cursor: onTagClick ? "pointer" : "default" }}
                  />
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
          {/* 合計金額 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-slate-500">合計</span>
            <span className="text-lg font-semibold text-slate-800">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="space-y-2">
        {data.map((item) => {
          const colors = getTagColorClasses(item.tagColor);
          return (
            <div
              key={item.tagId}
              className={`flex items-center justify-between py-2 border-b border-slate-100 last:border-0 ${onTagClick ? "cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors" : ""}`}
              onClick={() => onTagClick?.(item.tagId)}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm ${colors.bg} ${colors.text}`}
                >
                  #{item.tagName}
                </span>
                <span className="text-xs text-slate-500">({item.count}件)</span>
              </div>
              <div className="text-right">
                <div className="font-medium text-slate-800">
                  ¥{item.amount.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">{item.percentage}%</div>
              </div>
            </div>
          );
        })}

        {/* タグなし */}
        {untaggedAmount > 0 && (
          <div
            className={`flex items-center justify-between py-2 border-b border-slate-100 last:border-0 ${onTagClick ? "cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors" : ""}`}
            onClick={() => onTagClick?.("untagged")}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm bg-slate-100 text-slate-600">
                タグなし
              </span>
            </div>
            <div className="text-right">
              <div className="font-medium text-slate-800">
                ¥{untaggedAmount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">
                {totalAmount > 0
                  ? Math.round((untaggedAmount / totalAmount) * 1000) / 10
                  : 0}
                %
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

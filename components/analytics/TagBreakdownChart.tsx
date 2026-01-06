"use client";

import { useMemo } from "react";
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
};

export function TagBreakdownChart({
  data,
  totalAmount,
  untaggedAmount,
}: TagBreakdownChartProps) {
  // 円グラフのセグメントを計算
  const segments = useMemo(() => {
    if (data.length === 0 && untaggedAmount === 0) return [];

    const result: { color: string; percentage: number; startAngle: number }[] =
      [];
    let currentAngle = 0;

    // タグ付き支出
    for (const item of data) {
      result.push({
        color: getTagColorHex(item.tagColor),
        percentage: item.percentage,
        startAngle: currentAngle,
      });
      currentAngle += (item.percentage / 100) * 360;
    }

    // タグなし支出
    if (untaggedAmount > 0) {
      const untaggedPercentage =
        totalAmount > 0
          ? Math.round((untaggedAmount / totalAmount) * 1000) / 10
          : 0;
      result.push({
        color: "#94a3b8", // slate-400
        percentage: untaggedPercentage,
        startAngle: currentAngle,
      });
    }

    return result;
  }, [data, totalAmount, untaggedAmount]);

  // SVGの円弧パスを計算
  const createArcPath = (
    startAngle: number,
    endAngle: number,
    radius: number,
    centerX: number,
    centerY: number,
  ) => {
    const start = {
      x: centerX + radius * Math.cos((startAngle - 90) * (Math.PI / 180)),
      y: centerY + radius * Math.sin((startAngle - 90) * (Math.PI / 180)),
    };
    const end = {
      x: centerX + radius * Math.cos((endAngle - 90) * (Math.PI / 180)),
      y: centerY + radius * Math.sin((endAngle - 90) * (Math.PI / 180)),
    };
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };

  if (totalAmount === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-slate-500">
        この期間のデータがありません
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4">
      {/* 円グラフ + 凡例 横並び（50/50分割） */}
      <div className="flex">
        {/* 円グラフ（左半分） */}
        <div className="w-1/2 flex items-center justify-center">
          <div className="w-44 h-44 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {segments.map((segment, index) => {
                const endAngle =
                  segment.startAngle + (segment.percentage / 100) * 360;
                if (segment.percentage <= 0) return null;
                return (
                  <path
                    key={index}
                    d={createArcPath(segment.startAngle, endAngle, 45, 50, 50)}
                    fill={segment.color}
                  />
                );
              })}
              {/* 中央の円（ドーナツ型にする） */}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            {/* 合計金額 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
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
              {data.map((item) => {
                const colors = getTagColorClasses(item.tagColor);
                return (
                  <div
                    key={item.tagId}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs max-w-[5rem] truncate ${colors.bg} ${colors.text}`}
                    >
                      #{item.tagName}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({item.count})
                    </span>
                    <span className="font-medium text-slate-800 ml-auto pl-3 tabular-nums">
                      ¥{item.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 w-10 text-right tabular-nums">
                      {item.percentage}%
                    </span>
                  </div>
                );
              })}

              {/* タグなし */}
              {untaggedAmount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                    タグなし
                  </span>
                  <span className="font-medium text-slate-800 ml-auto pl-3 tabular-nums">
                    ¥{untaggedAmount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 w-10 text-right tabular-nums">
                    {totalAmount > 0
                      ? Math.round((untaggedAmount / totalAmount) * 1000) / 10
                      : 0}
                    %
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

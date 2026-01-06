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
    <div className="bg-white rounded-xl p-6 space-y-6">
      {/* 円グラフ */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
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
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
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
          <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
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

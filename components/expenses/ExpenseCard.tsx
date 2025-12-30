"use client";

import type { Id } from "@/convex/_generated/dataModel";

type ExpenseCardProps = {
  expense: {
    _id: Id<"expenses">;
    amount: number;
    date: string;
    memo?: string;
    splitMethod: string;
    category: {
      _id: Id<"categories">;
      name: string;
      icon: string;
    } | null;
    payer: {
      _id: Id<"users">;
      displayName: string;
      avatarUrl?: string;
    } | null;
    splits: {
      userId: Id<"users">;
      displayName: string;
      amount: number;
    }[];
  };
  onClick?: () => void;
};

/**
 * 日付を表示用にフォーマット（MM/DD）
 */
function formatDate(dateString: string): string {
  const [, month, day] = dateString.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

/**
 * 金額を表示用にフォーマット（カンマ区切り）
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

export function ExpenseCard({ expense, onClick }: ExpenseCardProps) {
  const { category, payer, amount, date, memo, splits } = expense;

  // 負担配分の表示（最大3人まで）
  const displaySplits = splits.slice(0, 3);
  const remainingCount = splits.length - 3;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        {/* 左側: カテゴリアイコン + 情報 */}
        <div className="flex gap-3">
          {/* カテゴリアイコン */}
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-lg">{category?.icon ?? "📦"}</span>
          </div>

          {/* 情報 */}
          <div>
            <div className="font-medium text-slate-800">
              {category?.name ?? "カテゴリなし"}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">
              {payer?.displayName ?? "不明"}が支払い
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatDate(date)}
              {memo && <span> ・ {memo}</span>}
            </div>
          </div>
        </div>

        {/* 右側: 金額 */}
        <div className="text-right">
          <div className="font-semibold text-slate-800">
            ¥{formatAmount(amount)}
          </div>
        </div>
      </div>

      {/* 負担配分 */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          均等分割 (
          {displaySplits.map((split, index) => (
            <span key={split.userId}>
              {index > 0 && " "}
              {split.displayName}:¥{formatAmount(split.amount)}
            </span>
          ))}
          {remainingCount > 0 && <span> 他{remainingCount}人</span>})
        </div>
      </div>
    </button>
  );
}

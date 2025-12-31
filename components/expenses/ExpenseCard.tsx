"use client";

import type { Id } from "@/convex/_generated/dataModel";

type ExpenseCardProps = {
  expense: {
    _id: Id<"expenses">;
    amount: number;
    date: string;
    title?: string;
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
  onEdit?: () => void;
  onDelete?: () => void;
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

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const { category, payer, amount, date, title, memo, splits } = expense;

  // タイトルがない場合はカテゴリ名をフォールバック
  const displayTitle = title || category?.name || "カテゴリなし";

  // 負担配分の表示（最大3人まで）
  const displaySplits = splits.slice(0, 3);
  const remainingCount = splits.length - 3;

  return (
    <div className="w-full text-left p-4 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-start justify-between">
        {/* 左側: カテゴリアイコン + 情報 */}
        <div className="flex gap-3">
          {/* カテゴリアイコン */}
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-lg">{category?.icon ?? "📦"}</span>
          </div>

          {/* 情報 */}
          <div>
            <div className="font-medium text-slate-800">{displayTitle}</div>
            <div className="text-sm text-slate-500 mt-0.5">
              {payer?.displayName ?? "不明"}が支払い
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatDate(date)}
              {title && category && <span> ・ {category.name}</span>}
              {memo && <span> ・ {memo}</span>}
            </div>
          </div>
        </div>

        {/* 右側: 金額 + アクション */}
        <div className="flex items-start gap-2">
          <div className="text-right">
            <div className="font-semibold text-slate-800">
              ¥{formatAmount(amount)}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="編集"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="削除"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            )}
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
    </div>
  );
}

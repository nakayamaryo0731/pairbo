"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import { formatDateShort, formatAmount } from "@/lib/formatters";

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
  memberColors?: Record<string, string>;
  onEdit?: () => void;
  onDelete?: () => void;
};

function buildSplitGradient(
  splits: { userId: Id<"users">; amount: number }[],
  total: number,
  colors: Record<string, string>,
): string {
  if (splits.length === 0 || total <= 0 || Object.keys(colors).length === 0)
    return "none";

  const stops: string[] = [];
  let position = 0;

  for (const split of splits) {
    const percentage = (split.amount / total) * 100;
    const color = colors[split.userId] ?? "#e2e8f0";
    stops.push(`${color} ${position}%`);
    position += percentage;
    stops.push(`${color} ${position}%`);
  }

  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/**
 * コンパクト支出カード
 * - 2行構成でスペース効率化
 * - 背景色で負担割合を表示
 */
export function ExpenseCard({
  expense,
  memberColors,
  onEdit,
  onDelete,
}: ExpenseCardProps) {
  const { category, payer, amount, date, title, splits } = expense;

  // タイトルがない場合はカテゴリ名をフォールバック
  const displayTitle = title || category?.name || "カテゴリなし";

  const handleCardClick = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const backgroundGradient = memberColors
    ? buildSplitGradient(splits, amount, memberColors)
    : "none";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="relative w-full text-left rounded-lg border border-slate-200 overflow-hidden cursor-pointer transition-colors"
    >
      {/* 背景のカラーバー */}
      {backgroundGradient !== "none" && (
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: backgroundGradient }}
        />
      )}

      {/* コンテンツ */}
      <div className="relative px-3 py-2.5">
        <div className="flex items-center gap-3">
          {/* カテゴリアイコン */}
          <div className="w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shrink-0">
            <span className="text-base">{category?.icon ?? "📦"}</span>
          </div>

          {/* 中央: タイトル + 詳細 */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">
              {displayTitle}
            </div>
            <div className="text-xs text-slate-500">
              {formatDateShort(date)} · {payer?.displayName ?? "不明"}が支払い
            </div>
          </div>

          {/* 右: 金額 + 削除ボタン */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="font-semibold text-slate-800">
              ¥{formatAmount(amount)}
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

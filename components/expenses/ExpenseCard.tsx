"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { Copy, Trash2, ChevronDown } from "lucide-react";
import { formatDateShort, formatAmount } from "@/lib/formatters";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { DEFAULT_ICON } from "@/lib/categoryIcons";
import { getTagColorClasses } from "@/lib/tagColors";

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
  tags?: { _id: Id<"tags">; name: string; color: string }[];
  memberColors?: Record<string, string>;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onCategoryClick?: () => void;
  onTagsClick?: () => void;
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
  tags,
  memberColors,
  onEdit,
  onDuplicate,
  onDelete,
  onCategoryClick,
  onTagsClick,
}: ExpenseCardProps) {
  const { category, payer, amount, date, title, splits } = expense;

  const displayTitle = title || category?.name || "カテゴリなし";

  const handleCardClick = () => {
    if (onEdit) {
      onEdit();
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const handleCategoryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCategoryClick?.();
  };

  const handleTagsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTagsClick?.();
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
          {onCategoryClick ? (
            <button
              type="button"
              onClick={handleCategoryClick}
              className="w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shrink-0 hover:bg-white transition-colors relative cursor-pointer"
            >
              <CategoryIcon
                name={category?.icon ?? DEFAULT_ICON}
                size="md"
                className="text-slate-600"
              />
              <ChevronDown className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-slate-400" />
            </button>
          ) : (
            <div className="w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shrink-0">
              <CategoryIcon
                name={category?.icon ?? DEFAULT_ICON}
                size="md"
                className="text-slate-600"
              />
            </div>
          )}

          {/* 中央: タイトル + 詳細 + タグ */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">
              {displayTitle}
            </div>
            <div className="text-xs text-slate-500">
              {formatDateShort(date)} · {payer?.displayName ?? "不明"}が支払い
            </div>
            {tags && tags.length > 0 && (
              <div
                className={`flex flex-wrap gap-1 mt-1 ${onTagsClick ? "cursor-pointer" : ""}`}
                onClick={onTagsClick ? handleTagsClick : undefined}
                role={onTagsClick ? "button" : undefined}
                tabIndex={onTagsClick ? 0 : undefined}
              >
                {tags.map((tag) => {
                  const colors = getTagColorClasses(tag.color);
                  return (
                    <span
                      key={tag._id}
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}
                    >
                      #{tag.name}
                    </span>
                  );
                })}
                {onTagsClick && (
                  <ChevronDown className="w-3 h-3 text-slate-400 self-center" />
                )}
              </div>
            )}
            {(!tags || tags.length === 0) && onTagsClick && (
              <button
                type="button"
                onClick={handleTagsClick}
                className="text-xs text-slate-400 hover:text-slate-500 mt-1 cursor-pointer"
              >
                + タグ
              </button>
            )}
          </div>

          {/* 右: 金額 + アクションボタン */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="font-semibold text-slate-800">
              ¥{formatAmount(amount)}
            </div>
            <div className="flex items-center -space-x-1">
              {onDuplicate && (
                <button
                  type="button"
                  onClick={handleDuplicate}
                  className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                  aria-label="複製"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
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
    </div>
  );
}

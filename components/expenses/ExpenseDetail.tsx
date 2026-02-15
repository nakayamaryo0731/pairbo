"use client";

import { useState } from "react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  formatDateJapanese,
  formatAmount,
  formatTimestamp,
  getSplitMethodLabel,
} from "@/lib/formatters";
import { ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { DEFAULT_ICON } from "@/lib/categoryIcons";

type ExpenseDetailProps = {
  expense: {
    _id: Id<"expenses">;
    groupId: Id<"groups">;
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
      avatarUrl?: string;
      amount: number;
    }[];
    createdBy: {
      _id: Id<"users">;
      displayName: string;
    } | null;
    linkedShoppingItems?: {
      _id: Id<"shoppingItems">;
      name: string;
    }[];
    createdAt: number;
    updatedAt: number;
  };
  isSettled: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  memberColors?: Record<string, string>;
};

export function ExpenseDetail({
  expense,
  isSettled,
  onDelete,
  isDeleting,
  memberColors,
}: ExpenseDetailProps) {
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* メイン情報 */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <CategoryIcon
              name={expense.category?.icon ?? DEFAULT_ICON}
              size="xl"
              className="text-slate-600"
            />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              ¥{formatAmount(expense.amount)}
            </div>
            <div className="text-lg text-slate-800 font-medium">
              {expense.title ?? expense.category?.name ?? "カテゴリなし"}
            </div>
            {expense.title && expense.category && (
              <div className="text-sm text-slate-500">
                {expense.category.name}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">日付</span>
            <span className="text-slate-800">
              {formatDateJapanese(expense.date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">支払者</span>
            <span className="text-slate-800 flex items-center gap-1.5">
              {expense.payer && memberColors?.[expense.payer._id] && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: memberColors[expense.payer._id] }}
                />
              )}
              {expense.payer?.displayName ?? "不明"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">負担方法</span>
            <span className="text-slate-800">
              {getSplitMethodLabel(expense.splitMethod)}
            </span>
          </div>
          {expense.memo && (
            <div className="flex justify-between">
              <span className="text-slate-500">メモ</span>
              <span className="text-slate-800">{expense.memo}</span>
            </div>
          )}
        </div>
      </div>

      {/* 負担配分 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-medium text-slate-800 mb-3">負担配分</h3>
        <div className="space-y-2">
          {expense.splits.map((split) => (
            <div
              key={split.userId}
              className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
            >
              <span className="text-slate-700 flex items-center gap-1.5">
                {memberColors?.[split.userId] && (
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: memberColors[split.userId] }}
                  />
                )}
                {split.displayName}
              </span>
              <span className="font-medium text-slate-800">
                ¥{formatAmount(split.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 連携した買い物リスト */}
      {expense.linkedShoppingItems &&
        expense.linkedShoppingItems.length > 0 && (
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsShoppingListOpen(!isShoppingListOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">
                  連携した買い物リスト
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {expense.linkedShoppingItems.length}件
                </span>
              </div>
              {isShoppingListOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {isShoppingListOpen && (
              <div className="divide-y divide-slate-100 bg-white">
                {expense.linkedShoppingItems.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <ShoppingCart className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* メタ情報 */}
      <div className="text-xs text-slate-400 space-y-1">
        <div>登録者: {expense.createdBy?.displayName ?? "不明"}</div>
        <div>登録日時: {formatTimestamp(expense.createdAt)}</div>
        {expense.updatedAt !== expense.createdAt && (
          <div>更新日時: {formatTimestamp(expense.updatedAt)}</div>
        )}
      </div>

      {/* 精算済み警告 */}
      {isSettled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm">
          この支出は精算済みの期間に含まれているため、編集・削除できません。
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        <Link
          href={`/groups/${expense.groupId}/expenses/${expense._id}/edit`}
          className={`flex-1 ${isSettled ? "pointer-events-none" : ""}`}
        >
          <Button variant="outline" className="w-full" disabled={isSettled}>
            編集
          </Button>
        </Link>
        <Button
          variant="outline"
          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          disabled={isSettled || isDeleting}
          onClick={onDelete}
        >
          {isDeleting ? "削除中..." : "削除"}
        </Button>
      </div>
    </div>
  );
}

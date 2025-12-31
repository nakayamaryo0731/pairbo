"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type ExpenseDetailProps = {
  expense: {
    _id: Id<"expenses">;
    groupId: Id<"groups">;
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
      avatarUrl?: string;
      amount: number;
    }[];
    createdBy: {
      _id: Id<"users">;
      displayName: string;
    } | null;
    createdAt: number;
    updatedAt: number;
  };
  isSettled: boolean;
  onDelete: () => void;
  isDeleting: boolean;
};

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getSplitMethodLabel(method: string): string {
  switch (method) {
    case "equal":
      return "均等分割";
    case "ratio":
      return "割合指定";
    case "amount":
      return "金額指定";
    case "full":
      return "全額負担";
    default:
      return method;
  }
}

export function ExpenseDetail({
  expense,
  isSettled,
  onDelete,
  isDeleting,
}: ExpenseDetailProps) {
  return (
    <div className="space-y-6">
      {/* メイン情報 */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">{expense.category?.icon ?? "📦"}</span>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">
              ¥{formatAmount(expense.amount)}
            </div>
            <div className="text-slate-600">
              {expense.category?.name ?? "カテゴリなし"}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">日付</span>
            <span className="text-slate-800">{formatDate(expense.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">支払者</span>
            <span className="text-slate-800">
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
              <span className="text-slate-700">{split.displayName}</span>
              <span className="font-medium text-slate-800">
                ¥{formatAmount(split.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

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

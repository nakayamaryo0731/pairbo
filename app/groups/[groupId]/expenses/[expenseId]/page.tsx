"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { ExpenseDetail } from "@/components/expenses/ExpenseDetail";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type PageProps = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

function ExpenseFormSkeleton() {
  return (
    <div className="space-y-6 py-2">
      {/* 金額 */}
      <div className="text-center py-4">
        <div className="h-14 w-48 mx-auto bg-slate-100 rounded-xl animate-pulse" />
      </div>
      {/* タイトル + 日付 */}
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-slate-100 rounded-xl animate-pulse" />
        <div className="w-36 h-12 bg-slate-100 rounded-xl animate-pulse" />
      </div>
      {/* カテゴリ */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-10 w-24 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-10 w-24 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
      {/* 支払者 */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-10 w-28 bg-slate-100 rounded-full animate-pulse" />
        </div>
      </div>
      {/* 負担方法 */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
      </div>
      {/* ボタン */}
      <div className="pt-2">
        <div className="h-14 w-full bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ExpensePage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId as Id<"groups">;
  const expenseId = resolvedParams.expenseId as Id<"expenses">;

  const expense = useQuery(api.expenses.getById, { expenseId });
  const detail = useQuery(api.groups.getDetail, { groupId });
  const removeExpense = useMutation(api.expenses.remove);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await removeExpense({ expenseId });
      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error("削除エラー:", error);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ローディング中
  if (expense === undefined || detail === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PageHeader backHref={`/groups/${groupId}`} isLoading />
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto bg-white rounded-2xl p-5">
            <ExpenseFormSkeleton />
          </div>
        </main>
      </div>
    );
  }

  // 支出が見つからない
  if (expense === null) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PageHeader backHref={`/groups/${groupId}`} title="支出詳細" />
        <main className="flex-1 p-4">
          <div className="text-center py-12 text-slate-500">
            支出が見つかりません
          </div>
        </main>
      </div>
    );
  }

  // 精算済みの場合は読み取り専用表示
  if (expense.isSettled) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PageHeader
          backHref={`/groups/${groupId}`}
          title="支出詳細"
          rightElement={
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
              精算済み
            </span>
          }
        />
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto">
            <ExpenseDetail
              expense={expense}
              isSettled={true}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          </div>
        </main>
        <DeleteExpenseDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          expense={{
            categoryIcon: expense.category?.icon ?? "📦",
            categoryName: expense.category?.name ?? "カテゴリなし",
            amount: expense.amount,
            date: expense.date,
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  // 編集可能な場合はフォームを表示
  const initialData = {
    expenseId: expense._id,
    amount: expense.amount,
    categoryId: expense.category?._id ?? detail.categories[0]?._id,
    paidBy: expense.payer?._id ?? detail.members[0]?.userId,
    date: expense.date,
    title: expense.title,
    memo: expense.memo,
    splitMethod: expense.splitMethod as "equal" | "ratio" | "amount" | "full",
    ratios:
      expense.splitMethod === "ratio"
        ? expense.splits.map((s) => ({
            userId: s.userId,
            ratio: Math.round((s.amount / expense.amount) * 100),
          }))
        : undefined,
    amounts:
      expense.splitMethod === "amount"
        ? expense.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
          }))
        : undefined,
    bearerId:
      expense.splitMethod === "full"
        ? expense.splits.find((s) => s.amount === expense.amount)?.userId
        : undefined,
    splits: expense.splits.map((s) => ({
      userId: s.userId,
      amount: s.amount,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader
        backHref={`/groups/${groupId}`}
        title="支出を編集"
        rightElement={
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            aria-label="削除"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        }
      />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-5">
          <ExpenseForm
            groupId={groupId}
            categories={detail.categories}
            members={detail.members.map((m) => ({
              userId: m.userId,
              displayName: m.displayName,
              isMe: m.isMe,
            }))}
            mode="edit"
            initialData={initialData}
          />
        </div>
      </main>

      <DeleteExpenseDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        expense={{
          categoryIcon: expense.category?.icon ?? "📦",
          categoryName: expense.category?.name ?? "カテゴリなし",
          amount: expense.amount,
          date: expense.date,
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

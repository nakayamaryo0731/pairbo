"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseDetail } from "@/components/expenses/ExpenseDetail";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";

type PageProps = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

export default function ExpenseDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const expenseId = resolvedParams.expenseId as Id<"expenses">;
  const groupId = resolvedParams.groupId as Id<"groups">;

  const expense = useQuery(api.expenses.getById, { expenseId });
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

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/groups/${groupId}`}
            className="text-slate-600 hover:text-slate-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">支出詳細</h1>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {expense === undefined ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
          </div>
        ) : expense === null ? (
          <div className="text-center py-12 text-slate-500">
            支出が見つかりません
          </div>
        ) : (
          <>
            <ExpenseDetail
              expense={expense}
              isSettled={expense.isSettled}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
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
          </>
        )}
      </div>
    </main>
  );
}

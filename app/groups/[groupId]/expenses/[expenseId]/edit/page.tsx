"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PageProps = {
  params: Promise<{
    groupId: string;
    expenseId: string;
  }>;
};

function ExpenseFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* 金額 */}
      <div className="space-y-2">
        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
      </div>
      {/* カテゴリ */}
      <div className="space-y-2">
        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
      </div>
      {/* 支払者 */}
      <div className="space-y-2">
        <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
      </div>
      {/* 日付 */}
      <div className="space-y-2">
        <div className="h-4 w-10 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
      </div>
      {/* メモ */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
        <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
      </div>
      {/* ボタン */}
      <div className="pt-4">
        <div className="h-10 w-full bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function ExpenseEditPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId as Id<"groups">;
  const expenseId = resolvedParams.expenseId as Id<"expenses">;

  const expense = useQuery(api.expenses.getById, { expenseId });
  const detail = useQuery(api.groups.getDetail, { groupId });

  // 精算済みの場合はリダイレクト
  if (expense !== undefined && expense !== null && expense.isSettled) {
    router.replace(`/groups/${groupId}/expenses/${expenseId}`);
    return null;
  }

  // ローディング中
  if (expense === undefined || detail === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
          <Link
            href={`/groups/${groupId}/expenses/${expenseId}`}
            className="text-slate-600 hover:text-slate-800 transition-colors"
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
          <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
        </header>
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6">
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
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
          <Link
            href={`/groups/${groupId}`}
            className="text-slate-600 hover:text-slate-800 transition-colors"
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
          <h1 className="font-bold text-xl text-slate-800">支出を編集</h1>
        </header>
        <main className="flex-1 p-4">
          <div className="text-center py-12 text-slate-500">
            支出が見つかりません
          </div>
        </main>
      </div>
    );
  }

  // initialDataの構築
  const initialData = {
    expenseId: expense._id,
    amount: expense.amount,
    categoryId: expense.category?._id ?? detail.categories[0]?._id,
    paidBy: expense.payer?._id ?? detail.members[0]?.userId,
    date: expense.date,
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
        <Link
          href={`/groups/${groupId}/expenses/${expenseId}`}
          className="text-slate-600 hover:text-slate-800 transition-colors"
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
        <h1 className="font-bold text-xl text-slate-800">支出を編集</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6">
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
    </div>
  );
}

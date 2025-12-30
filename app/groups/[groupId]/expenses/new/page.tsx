"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import Link from "next/link";

type PageProps = {
  params: Promise<{ groupId: string }>;
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

export default function ExpenseNewPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  // ローディング中
  if (detail === undefined) {
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
        <h1 className="font-bold text-xl text-slate-800">支出を記録</h1>
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-lg p-6">
          <ExpenseForm
            groupId={groupId as Id<"groups">}
            categories={detail.categories}
            members={detail.members.map((m) => ({
              userId: m.userId,
              displayName: m.displayName,
              isMe: m.isMe,
            }))}
          />
        </div>
      </main>
    </div>
  );
}

"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { PageHeader } from "@/components/ui/PageHeader";

type PageProps = {
  params: Promise<{ groupId: string }>;
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

export default function ExpenseNewPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  // ローディング中
  if (detail === undefined) {
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader backHref={`/groups/${groupId}`} title="支出を記録" />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-5">
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

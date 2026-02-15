"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTagColorClasses } from "@/lib/tagColors";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/components/categories/CategoryIcon";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function ExpenseListPage({ params }: PageProps) {
  const { groupId } = use(params);
  const searchParams = useSearchParams();

  const categoryId = searchParams.get("category") as Id<"categories"> | null;
  const tagId = searchParams.get("tag") as Id<"tags"> | "untagged" | null;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const isAllTime = searchParams.get("all") === "true";

  // カテゴリ別支出一覧
  const categoryExpenses = useQuery(
    api.expenses.listByCategory,
    categoryId && year && !isAllTime
      ? {
          groupId: groupId as Id<"groups">,
          categoryId,
          year: parseInt(year),
          month: month ? parseInt(month) : undefined,
        }
      : "skip",
  );

  const categoryExpensesAllTime = useQuery(
    api.expenses.listByCategoryAllTime,
    categoryId && isAllTime
      ? {
          groupId: groupId as Id<"groups">,
          categoryId,
        }
      : "skip",
  );

  // タグ別支出一覧
  const tagExpenses = useQuery(
    api.expenses.listByTag,
    tagId && year && !isAllTime
      ? {
          groupId: groupId as Id<"groups">,
          tagId,
          year: parseInt(year),
          month: month ? parseInt(month) : undefined,
        }
      : "skip",
  );

  const tagExpensesAllTime = useQuery(
    api.expenses.listByTagAllTime,
    tagId && isAllTime
      ? {
          groupId: groupId as Id<"groups">,
          tagId,
        }
      : "skip",
  );

  // データ取得
  const data = categoryId
    ? isAllTime
      ? categoryExpensesAllTime
      : categoryExpenses
    : tagId
      ? isAllTime
        ? tagExpensesAllTime
        : tagExpenses
      : null;

  const isLoading = data === undefined;

  // ページタイトルの構築
  let title = "支出一覧";
  let subtitle = "";

  if (data) {
    if ("category" in data && data.category) {
      title = data.category.name;
    } else if ("tag" in data) {
      if (data.isUntagged) {
        title = "タグなし";
      } else if (data.tag) {
        title = `#${data.tag.name}`;
      }
    }
    subtitle = data.periodLabel ?? "全期間";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        backHref={`/groups/${groupId}/analytics`}
        title={title}
        isLoading={isLoading}
      />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          {isLoading ? (
            <ExpenseListSkeleton />
          ) : data ? (
            <>
              {/* サマリー */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {data.totalCount}件
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-800">
                      ¥{data.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* 支出一覧 */}
              {data.expenses.length === 0 ? (
                <EmptyState title="この期間の支出はありません" />
              ) : (
                <div className="space-y-2">
                  {data.expenses.map((expense) => (
                    <Link
                      key={expense._id}
                      href={`/groups/${groupId}/expenses/${expense._id}`}
                      className="block"
                    >
                      <ExpenseItem expense={expense} />
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState title="データが見つかりません" />
          )}
        </div>
      </main>
    </div>
  );
}

type ExpenseItemProps = {
  expense: {
    _id: Id<"expenses">;
    amount: number;
    date: string;
    title?: string;
    category: { name: string; icon: string } | null;
    payer: { displayName: string; avatarUrl?: string | null } | null;
    tags?: { _id: Id<"tags">; name: string; color: string }[];
  };
};

function ExpenseItem({ expense }: ExpenseItemProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CategoryIcon
              name={expense.category?.icon ?? "package"}
              size="md"
              className="text-slate-600"
            />
            <span className="font-medium text-slate-800 truncate">
              {expense.title || expense.category?.name || "不明"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>{expense.date}</span>
            {expense.payer && (
              <>
                <span>·</span>
                <span>{expense.payer.displayName}</span>
              </>
            )}
          </div>
          {expense.tags && expense.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {expense.tags.map((tag) => {
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
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-slate-800">
            ¥{expense.amount.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function ExpenseListSkeleton() {
  return (
    <>
      <Skeleton className="h-20 rounded-lg mb-4" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </>
  );
}

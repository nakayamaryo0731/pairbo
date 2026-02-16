"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseCard } from "@/components/expenses/ExpenseCard";
import { CategoryPicker } from "@/components/expenses/CategoryPicker";
import { TagSelector } from "@/components/expenses/TagSelector";
import { buildMemberColorMap } from "@/lib/userColors";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function ExpenseListPage({ params }: PageProps) {
  const { groupId } = use(params);
  const searchParams = useSearchParams();
  const { isAuthenticated } = useConvexAuth();

  const categoryId = searchParams.get("category") as Id<"categories"> | null;
  const tagId = searchParams.get("tag") as Id<"tags"> | "untagged" | null;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const isAllTime = searchParams.get("all") === "true";

  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  const subscription = useQuery(
    api.subscriptions.getMySubscription,
    isAuthenticated ? {} : "skip",
  );
  const isPremium = subscription?.plan === "premium";

  const updateCategory = useMutation(api.expenses.updateCategory);
  const updateTags = useMutation(api.expenses.updateTags);

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

  const data = categoryId
    ? isAllTime
      ? categoryExpensesAllTime
      : categoryExpenses
    : tagId
      ? isAllTime
        ? tagExpensesAllTime
        : tagExpenses
      : null;

  const isLoading = data === undefined || detail === undefined;

  const memberColors = detail ? buildMemberColorMap(detail.members) : undefined;

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
                    <DrilldownExpenseCard
                      key={expense._id}
                      expense={expense}
                      groupId={groupId as Id<"groups">}
                      categories={detail?.categories ?? []}
                      memberColors={memberColors}
                      isPremium={isPremium}
                      onUpdateCategory={(expenseId, catId) =>
                        updateCategory({ expenseId, categoryId: catId })
                      }
                      onUpdateTags={(expenseId, tagIds) =>
                        updateTags({ expenseId, tagIds })
                      }
                    />
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

type DrilldownExpenseCardProps = {
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
    tags: { _id: Id<"tags">; name: string; color: string }[];
  };
  groupId: Id<"groups">;
  categories: { _id: Id<"categories">; name: string; icon: string }[];
  memberColors?: Record<string, string>;
  isPremium: boolean;
  onUpdateCategory: (
    expenseId: Id<"expenses">,
    categoryId: Id<"categories">,
  ) => void;
  onUpdateTags: (expenseId: Id<"expenses">, tagIds: Id<"tags">[]) => void;
};

function DrilldownExpenseCard({
  expense,
  groupId,
  categories,
  memberColors,
  isPremium,
  onUpdateCategory,
  onUpdateTags,
}: DrilldownExpenseCardProps) {
  const router = useRouter();
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  return (
    <div className="relative">
      <ExpenseCard
        expense={expense}
        tags={expense.tags}
        memberColors={memberColors}
        onEdit={() => router.push(`/groups/${groupId}/expenses/${expense._id}`)}
        onCategoryClick={() => setCategoryPickerOpen(true)}
        onTagsClick={() => setTagPopoverOpen(true)}
      />

      <CategoryPicker
        categories={categories}
        currentCategoryId={expense.category?._id ?? null}
        onSelect={(catId) => onUpdateCategory(expense._id, catId)}
        open={categoryPickerOpen}
        onOpenChange={setCategoryPickerOpen}
      />

      <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <TagSelector
            groupId={groupId}
            selectedTagIds={expense.tags.map((t) => t._id)}
            onSelectionChange={(tagIds) => {
              onUpdateTags(expense._id, tagIds);
            }}
            isPremium={isPremium}
          />
        </PopoverContent>
      </Popover>
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

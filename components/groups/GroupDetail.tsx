"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { usePeriodNavigation } from "@/hooks";
import { PeriodExpenseList, DeleteExpenseDialog } from "@/components/expenses";

const ExpenseEditModal = dynamic(() =>
  import("@/components/expenses/ExpenseEditModal").then(
    (m) => m.ExpenseEditModal,
  ),
);
const ExpenseCreateModal = dynamic(() =>
  import("@/components/expenses/ExpenseCreateModal").then(
    (m) => m.ExpenseCreateModal,
  ),
);
import { SettlementPreview, PeriodNavigator } from "@/components/settlements";
import { FAB } from "@/components/ui/FAB";
import { Plus } from "lucide-react";
import type { ClosingDay } from "@/convex/domain/group/types";
import { buildMemberColorMap } from "@/lib/userColors";
import { getErrorMessage } from "@/lib/errors";
import { InviteCtaBanner } from "./InviteCtaBanner";
import { TrialRemainingBanner } from "@/components/ui/TrialRemainingBanner";

type Member = {
  userId: Id<"users">;
  displayName: string;
  isMe: boolean;
  color?: string;
  joinedAt: number;
};

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
};

type GroupDetailProps = {
  group: {
    _id: Id<"groups">;
    name: string;
    description?: string;
    closingDay: ClosingDay;
  };
  members: Member[];
  categories: Category[];
  shouldShowInviteBanner?: boolean;
};

type CreateState =
  { mode: "new" } | { mode: "duplicate"; fromExpenseId: Id<"expenses"> };

type ExpenseToDelete = {
  _id: Id<"expenses">;
  amount: number;
  date: string;
  categoryIcon: string;
  categoryName: string;
};

export function GroupDetail({
  group,
  members,
  categories,
  shouldShowInviteBanner = false,
}: GroupDetailProps) {
  const removeExpense = useMutation(api.expenses.remove);

  // 期間ナビゲーション
  const {
    year: displayYear,
    month: displayMonth,
    goToPreviousMonth,
    goToNextMonth,
    period,
  } = usePeriodNavigation({ closingDay: group.closingDay });

  const memberColors = useMemo(() => buildMemberColorMap(members), [members]);

  // 削除ダイアログ用の状態
  const [expenseToDelete, setExpenseToDelete] =
    useState<ExpenseToDelete | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [editingExpenseId, setEditingExpenseId] =
    useState<Id<"expenses"> | null>(null);

  const [creating, setCreating] = useState<CreateState | null>(null);

  const handleEdit = useCallback((expenseId: Id<"expenses">) => {
    setEditingExpenseId(expenseId);
  }, []);

  const handleNew = useCallback(() => {
    setCreating({ mode: "new" });
  }, []);

  const handleDuplicate = useCallback((expenseId: Id<"expenses">) => {
    setCreating({ mode: "duplicate", fromExpenseId: expenseId });
  }, []);

  const handleDelete = useCallback((expense: ExpenseToDelete) => {
    setExpenseToDelete(expense);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!expenseToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await removeExpense({ expenseId: expenseToDelete._id });
      setExpenseToDelete(null);
    } catch (e) {
      setDeleteError(getErrorMessage(e, "支出の削除に失敗しました"));
    } finally {
      setIsDeleting(false);
    }
  }, [expenseToDelete, removeExpense]);

  return (
    <div className="flex flex-col">
      {/* 期間ナビ（sticky: ヘッダーの下に固定） */}
      <div className="sticky top-14 z-10 bg-slate-50 px-4 py-2">
        <PeriodNavigator
          year={displayYear}
          month={displayMonth}
          startDate={period!.startDate}
          endDate={period!.endDate}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
        />
      </div>

      {/* trial 残り3日以下のバナー（free に降格する前の課金導線） */}
      <TrialRemainingBanner />

      {/* 招待リマインダーバナー（1人グループのみ） */}
      {shouldShowInviteBanner && (
        <div className="px-4 pt-3">
          <InviteCtaBanner groupId={group._id} />
        </div>
      )}

      {/* 支出一覧 */}
      <div className="px-4 pb-36 scrollbar-hide">
        <PeriodExpenseList
          groupId={group._id}
          year={displayYear}
          month={displayMonth}
          memberColors={memberColors}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </div>

      {/* 精算カード + FAB（タブナビの上に固定） */}
      <div className="fixed bottom-14 left-0 right-0 z-10 bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-lg mx-auto px-4 py-2 relative">
          <FAB onClick={handleNew} icon={<Plus />} label="支出を記録" />
          <SettlementPreview
            groupId={group._id}
            year={displayYear}
            month={displayMonth}
            compact
            memberColors={memberColors}
          />
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {expenseToDelete && (
        <DeleteExpenseDialog
          open={!!expenseToDelete}
          onOpenChange={(open) => {
            if (!open) {
              setExpenseToDelete(null);
              setDeleteError(null);
            }
          }}
          expense={{
            categoryIcon: expenseToDelete.categoryIcon,
            categoryName: expenseToDelete.categoryName,
            amount: expenseToDelete.amount,
            date: expenseToDelete.date,
          }}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {/* 支出編集モーダル */}
      {editingExpenseId && (
        <ExpenseEditModal
          expenseId={editingExpenseId}
          groupId={group._id}
          onClose={() => setEditingExpenseId(null)}
        />
      )}

      {/* 支出登録モーダル */}
      {creating && (
        <ExpenseCreateModal
          groupId={group._id}
          categories={categories}
          members={members.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            isMe: m.isMe,
          }))}
          fromExpenseId={
            creating.mode === "duplicate" ? creating.fromExpenseId : undefined
          }
          memberColors={memberColors}
          onClose={() => setCreating(null)}
        />
      )}
    </div>
  );
}

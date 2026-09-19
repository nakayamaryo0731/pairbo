"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ExpenseForm } from "./ExpenseForm";
import { X } from "lucide-react";
import { useEscapeKey, useGroupPremium } from "@/hooks";

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
};

type Member = {
  userId: Id<"users">;
  displayName: string;
  isMe: boolean;
};

type ExpenseCreateModalProps = {
  groupId: Id<"groups">;
  categories: Category[];
  members: Member[];
  fromExpenseId?: Id<"expenses">;
  memberColors?: Record<string, string>;
  onClose: () => void;
};

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function ExpenseCreateModal({
  groupId,
  categories,
  members,
  fromExpenseId,
  memberColors,
  onClose,
}: ExpenseCreateModalProps) {
  const sourceExpense = useQuery(
    api.expenses.getById,
    fromExpenseId ? { expenseId: fromExpenseId } : "skip",
  );

  const { isPremium } = useGroupPremium(groupId);
  const isWaitingForSource = !!fromExpenseId && sourceExpense === undefined;

  useEscapeKey(onClose);

  const initialData =
    sourceExpense && sourceExpense.category && sourceExpense.payer
      ? {
          amount: sourceExpense.amount,
          categoryId: sourceExpense.category._id,
          paidBy: sourceExpense.payer._id,
          date: getTodayString(),
          title: sourceExpense.title,
          memo: sourceExpense.memo,
          splitMethod: sourceExpense.splitMethod as
            "equal" | "ratio" | "amount" | "full",
          ratios:
            sourceExpense.splitMethod === "ratio"
              ? sourceExpense.splits.map((s) => ({
                  userId: s.userId,
                  ratio: Math.round((s.amount / sourceExpense.amount) * 100),
                }))
              : undefined,
          amounts:
            sourceExpense.splitMethod === "amount"
              ? sourceExpense.splits.map((s) => ({
                  userId: s.userId,
                  amount: s.amount,
                }))
              : undefined,
          bearerId:
            sourceExpense.splitMethod === "full"
              ? sourceExpense.splits.find(
                  (s) => s.amount === sourceExpense.amount,
                )?.userId
              : undefined,
          splits: sourceExpense.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
          })),
        }
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl p-4 max-h-[95dvh] overflow-y-auto overflow-x-hidden shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-800">支出を記録</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          {isWaitingForSource ? (
            <div className="space-y-6 py-2">
              <div className="text-center py-4">
                <div className="h-14 w-48 mx-auto bg-slate-100 rounded-xl animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-12 bg-slate-100 rounded-xl animate-pulse" />
                <div className="w-36 h-12 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : (
            <ExpenseForm
              groupId={groupId}
              categories={categories}
              members={members}
              initialData={initialData}
              isPremium={isPremium}
              memberColors={memberColors}
              onClose={onClose}
              autoFocusAmount
            />
          )}
        </div>
      </div>
    </div>
  );
}

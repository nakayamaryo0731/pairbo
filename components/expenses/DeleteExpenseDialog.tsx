"use client";

import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { formatDateJapanese, formatAmount } from "@/lib/formatters";
import { CategoryIcon } from "@/components/categories/CategoryIcon";

type DeleteExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: {
    categoryIcon: string;
    categoryName: string;
    amount: number;
    date: string;
  };
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
  isDeleting,
}: DeleteExpenseDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="この支出を削除しますか？"
      description="削除すると元に戻すことはできません。"
      onConfirm={onConfirm}
      isLoading={isDeleting}
      confirmLabel="削除する"
    >
      <div className="bg-slate-50 rounded-lg p-4 my-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
            <CategoryIcon
              name={expense.categoryIcon}
              size="md"
              className="text-slate-600"
            />
          </div>
          <div>
            <div className="font-medium text-slate-800">
              {expense.categoryName}
            </div>
            <div className="text-sm text-slate-500">
              {formatDateJapanese(expense.date)}
            </div>
          </div>
          <div className="ml-auto font-semibold text-slate-800">
            ¥{formatAmount(expense.amount)}
          </div>
        </div>
      </div>
    </ConfirmationDialog>
  );
}

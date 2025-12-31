"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${year}年${parseInt(month)}月${parseInt(day)}日`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
  isDeleting,
}: DeleteExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>この支出を削除しますか？</DialogTitle>
          <DialogDescription>
            削除すると元に戻すことはできません。
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-lg p-4 my-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200">
              <span className="text-lg">{expense.categoryIcon}</span>
            </div>
            <div>
              <div className="font-medium text-slate-800">
                {expense.categoryName}
              </div>
              <div className="text-sm text-slate-500">
                {formatDate(expense.date)}
              </div>
            </div>
            <div className="ml-auto font-semibold text-slate-800">
              ¥{formatAmount(expense.amount)}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

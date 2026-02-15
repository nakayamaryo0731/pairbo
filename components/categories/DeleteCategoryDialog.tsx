"use client";

import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { CategoryIcon } from "./CategoryIcon";

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    icon: string;
    name: string;
  };
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
  isDeleting,
}: DeleteCategoryDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="カテゴリを削除"
      description="このカテゴリを削除してもよろしいですか？"
      onConfirm={onConfirm}
      isLoading={isDeleting}
      confirmLabel="削除する"
    >
      <div className="py-4">
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
          <CategoryIcon
            name={category.icon}
            size="lg"
            className="text-slate-700"
          />
          <span className="font-medium">{category.name}</span>
        </div>
      </div>
    </ConfirmationDialog>
  );
}

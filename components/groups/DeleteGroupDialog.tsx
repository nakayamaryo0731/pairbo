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

type DeleteGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    name: string;
    memberCount: number;
  };
  onConfirm: () => void;
  isDeleting: boolean;
};

export function DeleteGroupDialog({
  open,
  onOpenChange,
  group,
  onConfirm,
  isDeleting,
}: DeleteGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>グループを削除しますか？</DialogTitle>
          <DialogDescription>
            この操作は取り消せません。グループ内の全データ（支出、精算履歴、買い物リスト等）が完全に削除されます。
          </DialogDescription>
        </DialogHeader>

        <div className="bg-slate-50 rounded-lg p-4 my-4">
          <div className="font-medium text-slate-800">{group.name}</div>
          <div className="text-sm text-slate-500 mt-1">
            メンバー {group.memberCount}人
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

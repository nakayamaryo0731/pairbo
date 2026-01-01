"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: {
    name: string;
  };
  onSave: (name: string) => void;
  isSaving: boolean;
};

export function EditGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
  isSaving,
}: EditGroupDialogProps) {
  const [name, setName] = useState(group.name);

  useEffect(() => {
    if (open) {
      setName(group.name);
    }
  }, [open, group.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const isValid = name.trim().length > 0 && name.trim() !== group.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>グループ名を編集</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="group-name" className="sr-only">
              グループ名
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="グループ名"
              maxLength={50}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!isValid || isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

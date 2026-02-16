"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormDialog } from "@/hooks/useFormDialog";
import { trackEvent } from "@/lib/analytics";

type CreateGroupDialogProps = {
  children: React.ReactNode;
};

export function CreateGroupDialog({ children }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { open, handleOpenChange, isLoading, error, execute } = useFormDialog({
    onReset: () => {
      setName("");
      setDescription("");
    },
  });

  const createGroup = useMutation(api.groups.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;

    const result = await execute(() =>
      createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    );

    if (result.success) {
      trackEvent("create_group");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>グループを作成</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">グループ名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 我が家"
              required
              autoFocus
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">説明（任意）</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="グループの説明を入力"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? "作成中..." : "作成する"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

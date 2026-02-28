"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagColorPicker } from "./TagColorPicker";
import { TAG_LIMITS } from "@/convex/domain/tag/types";

type TagFormProps = {
  mode: "create" | "edit";
  initialName?: string;
  initialColor?: string;
  onSubmit: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
};

export function TagForm({
  mode,
  initialName = "",
  initialColor = "blue",
  onSubmit,
  onCancel,
  isLoading,
}: TagFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const trimmedName = name.trim();
  const isValid =
    trimmedName.length >= TAG_LIMITS.MIN_NAME_LENGTH &&
    trimmedName.length <= TAG_LIMITS.MAX_NAME_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    await onSubmit(trimmedName, color);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">タグ名</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="タグ名を入力"
          maxLength={TAG_LIMITS.MAX_NAME_LENGTH}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">カラー</label>
        <TagColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={!isValid || isLoading}>
          {isLoading ? "保存中..." : mode === "create" ? "追加" : "保存"}
        </Button>
      </div>
    </form>
  );
}

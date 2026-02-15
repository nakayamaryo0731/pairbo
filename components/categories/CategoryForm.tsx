"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPicker } from "./IconPicker";
import { CategoryIcon } from "./CategoryIcon";
import { DEFAULT_ICON } from "@/lib/categoryIcons";

type CategoryFormProps = {
  mode: "create" | "edit";
  initialName?: string;
  initialIcon?: string;
  onSubmit: (name: string, icon: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
};

export function CategoryForm({
  mode,
  initialName = "",
  initialIcon = DEFAULT_ICON,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onSubmit(name, icon);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>アイコン</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="w-12 h-12 border rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
          >
            <CategoryIcon name={icon} size="lg" className="text-slate-700" />
          </button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowIconPicker(true)}
          >
            変更
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-name">カテゴリ名</Label>
        <Input
          id="category-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 家賃"
          maxLength={20}
          disabled={isLoading}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading
            ? "処理中..."
            : mode === "create"
              ? "追加する"
              : "更新する"}
        </Button>
      </div>

      <IconPicker
        open={showIconPicker}
        onOpenChange={setShowIconPicker}
        onSelect={setIcon}
      />
    </form>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getTagColorClasses } from "@/lib/tagColors";

const MAX_TAGS_PER_EXPENSE = 10;

type Tag = {
  _id: Id<"tags">;
  name: string;
  color: string;
};

type TagSelectorProps = {
  groupId: Id<"groups">;
  selectedTagIds: Id<"tags">[];
  onSelectionChange: (tagIds: Id<"tags">[]) => void;
  isPremium: boolean;
  disabled?: boolean;
};

export function TagSelector({
  groupId,
  selectedTagIds,
  onSelectionChange,
  isPremium,
  disabled = false,
}: TagSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = useQuery((api as any).tags.list, { groupId }) as
    | Tag[]
    | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTag = useMutation((api as any).tags.create);

  // 選択されたタグ情報を取得
  const selectedTags =
    tags?.filter((t: Tag) => selectedTagIds.includes(t._id)) ?? [];

  // クリック外で閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 検索結果のフィルタリング
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTags =
    tags?.filter((t: Tag) => t.name.toLowerCase().includes(normalizedQuery)) ??
    [];

  // 完全一致チェック
  const exactMatch = tags?.find(
    (t: Tag) => t.name.toLowerCase() === normalizedQuery,
  );

  // 表示するタグ（入力なしの場合は並び順で先頭5件）
  const displayTags =
    normalizedQuery === ""
      ? (tags?.slice(0, 5) ?? [])
      : filteredTags.slice(0, 10);

  const isAtLimit = selectedTagIds.length >= MAX_TAGS_PER_EXPENSE;

  const handleSelect = (tag: Tag) => {
    if (selectedTagIds.includes(tag._id)) {
      // 選択解除
      onSelectionChange(selectedTagIds.filter((id) => id !== tag._id));
    } else {
      // 上限チェック
      if (isAtLimit) return;
      // 選択追加
      onSelectionChange([...selectedTagIds, tag._id]);
    }
    setQuery("");
  };

  const handleRemove = (tagId: Id<"tags">) => {
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const handleCreate = async () => {
    if (!normalizedQuery || exactMatch || isCreating || isAtLimit) return;

    setIsCreating(true);
    try {
      const newTagId = await createTag({
        groupId,
        name: query.trim(),
      });
      onSelectionChange([...selectedTagIds, newTagId]);
      setQuery("");
    } catch {
      // エラーは無視（Premium制限など）
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (normalizedQuery && !exactMatch) {
        handleCreate();
      } else if (displayTags.length > 0) {
        handleSelect(displayTags[0]);
      }
    }
  };

  if (!isPremium) {
    return (
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          タグ
        </span>
        <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            タグ機能はPremiumプランでご利用いただけます
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        タグ
      </span>

      {/* 選択中のタグ */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => {
            const colors = getTagColorClasses(tag.color);
            return (
              <span
                key={tag._id}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${colors.bg} ${colors.text} border ${colors.border}`}
              >
                #{tag.name}
                <button
                  type="button"
                  onClick={() => handleRemove(tag._id)}
                  className="hover:opacity-70 ml-1"
                  disabled={disabled}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 上限警告 */}
      {isAtLimit && (
        <p className="text-xs text-amber-600">
          タグは{MAX_TAGS_PER_EXPENSE}個まで設定できます
        </p>
      )}

      {/* Combobox */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={
            isAtLimit ? "タグ上限に達しました" : "タグを検索または作成..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => !isAtLimit && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isAtLimit}
          className="w-full py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400 disabled:opacity-50"
        />

        {/* ドロップダウン */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-auto">
            {displayTags.length === 0 && !normalizedQuery && (
              <div className="p-3 text-sm text-slate-500">タグがありません</div>
            )}

            {displayTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag._id);
              const colors = getTagColorClasses(tag.color);
              return (
                <button
                  key={tag._id}
                  type="button"
                  onClick={() => handleSelect(tag)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm ${colors.bg} ${colors.text}`}
                  >
                    #{tag.name}
                  </span>
                  {isSelected && (
                    <span className="ml-auto text-blue-500 text-sm">✓</span>
                  )}
                </button>
              );
            })}

            {/* 新規作成オプション */}
            {normalizedQuery && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <span className="text-blue-500">+</span>
                <span className="text-sm">
                  {isCreating ? "作成中..." : `「${query.trim()}」を作成`}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

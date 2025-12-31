"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ShoppingCart, ChevronDown, ChevronUp, Check } from "lucide-react";

type ShoppingItemSelectorProps = {
  groupId: Id<"groups">;
  selectedIds: Id<"shoppingItems">[];
  onSelectionChange: (ids: Id<"shoppingItems">[]) => void;
};

export function ShoppingItemSelector({
  groupId,
  selectedIds,
  onSelectionChange,
}: ShoppingItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const pendingItems = useQuery(api.shoppingList.listPending, { groupId });

  const toggleItem = (itemId: Id<"shoppingItems">) => {
    if (selectedIds.includes(itemId)) {
      onSelectionChange(selectedIds.filter((id) => id !== itemId));
    } else {
      onSelectionChange([...selectedIds, itemId]);
    }
  };

  // アイテムがない場合は表示しない
  if (pendingItems === undefined || pendingItems.length === 0) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            買い物リストから選択
          </span>
          {selectedIds.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {selectedIds.length}件選択中
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* アイテム一覧（展開時） */}
      {isOpen && (
        <div className="divide-y divide-slate-100">
          {pendingItems.map((item) => {
            const isSelected = selectedIds.includes(item._id);
            return (
              <button
                key={item._id}
                type="button"
                onClick={() => toggleItem(item._id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  isSelected ? "bg-blue-50" : ""
                }`}
              >
                <div
                  className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "border-slate-300"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <span
                  className={`text-sm ${isSelected ? "text-blue-900" : "text-slate-700"}`}
                >
                  {item.name}
                </span>
              </button>
            );
          })}

          {/* 選択状況サマリー */}
          {selectedIds.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500">
              登録時に選択したアイテムは購入済みになります
            </div>
          )}
        </div>
      )}
    </div>
  );
}

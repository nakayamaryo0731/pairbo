"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Circle, CheckCircle2, X, Undo2 } from "lucide-react";

type ShoppingItemProps = {
  item: {
    _id: Id<"shoppingItems">;
    name: string;
    purchasedAt?: number;
    linkedExpenseId?: Id<"expenses">;
    addedByUser?: { displayName: string } | null;
    purchasedByUser?: { displayName: string } | null;
  };
  mode: "pending" | "purchased";
};

export function ShoppingItem({ item, mode }: ShoppingItemProps) {
  const [isLoading, setIsLoading] = useState(false);

  const markPurchased = useMutation(api.shoppingList.markPurchased);
  const unmarkPurchased = useMutation(api.shoppingList.unmarkPurchased);
  const removeItem = useMutation(api.shoppingList.remove);

  const handleTogglePurchased = async () => {
    setIsLoading(true);
    try {
      if (mode === "pending") {
        await markPurchased({ itemId: item._id });
      } else if (!item.linkedExpenseId) {
        await unmarkPurchased({ itemId: item._id });
      }
    } catch {
      // エラーは無視（UIに表示しない）
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      await removeItem({ itemId: item._id });
    } catch {
      // エラーは無視
    } finally {
      setIsLoading(false);
    }
  };

  const isPurchased = mode === "purchased";
  const canUnpurchase = isPurchased && !item.linkedExpenseId;

  return (
    <div
      className={`flex items-center gap-3 py-3 px-3 border-b border-slate-100 last:border-b-0 ${
        isPurchased ? "bg-slate-50" : ""
      }`}
    >
      {/* 購入チェック */}
      <button
        onClick={handleTogglePurchased}
        disabled={isLoading || (isPurchased && !canUnpurchase)}
        className={`shrink-0 transition-colors ${
          isPurchased ? "text-green-600" : "text-slate-400 hover:text-slate-600"
        } ${isLoading ? "opacity-50" : ""}`}
        aria-label={isPurchased ? "購入解除" : "購入済みにする"}
      >
        {isPurchased ? (
          <CheckCircle2 className="h-6 w-6" />
        ) : (
          <Circle className="h-6 w-6" />
        )}
      </button>

      {/* アイテム名 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-base truncate ${isPurchased ? "line-through text-slate-500" : "text-slate-900"}`}
        >
          {item.name}
        </p>
        {isPurchased && item.purchasedByUser && (
          <p className="text-xs text-slate-400">
            {item.purchasedByUser.displayName}が購入
            {item.linkedExpenseId && " (支出連携済み)"}
          </p>
        )}
      </div>

      {/* アクションボタン */}
      {mode === "pending" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isLoading}
          className="shrink-0 text-slate-400 hover:text-red-600"
          aria-label="削除"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      {canUnpurchase && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleTogglePurchased}
          disabled={isLoading}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          aria-label="購入解除"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

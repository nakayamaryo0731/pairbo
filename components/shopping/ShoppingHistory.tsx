"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { ShoppingItem } from "./ShoppingItem";

type PurchasedItem = {
  _id: Id<"shoppingItems">;
  name: string;
  purchasedAt?: number;
  linkedExpenseId?: Id<"expenses">;
  addedByUser?: { displayName: string } | null;
  purchasedByUser?: { displayName: string } | null;
};

type ShoppingHistoryProps = {
  items: PurchasedItem[];
};

export function ShoppingHistory({ items }: ShoppingHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        購入履歴はありません
      </div>
    );
  }

  // 日付でグループ化
  const groupedByDate = items.reduce(
    (acc, item) => {
      if (!item.purchasedAt) return acc;
      const dateKey = new Date(item.purchasedAt).toLocaleDateString("ja-JP", {
        month: "long",
        day: "numeric",
      });
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    },
    {} as Record<string, PurchasedItem[]>,
  );

  return (
    <div className="space-y-4">
      {Object.entries(groupedByDate).map(([date, dateItems]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-slate-500 mb-2">{date}</h3>
          <div className="bg-white rounded-lg border border-slate-200">
            {dateItems.map((item) => (
              <ShoppingItem key={item._id} item={item} mode="purchased" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

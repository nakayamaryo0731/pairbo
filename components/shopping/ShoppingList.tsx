"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ShoppingItemInput } from "./ShoppingItemInput";
import { ShoppingItem } from "./ShoppingItem";
import { ShoppingHistory } from "./ShoppingHistory";
import { Button } from "@/components/ui/button";
import { History, ShoppingCart, ChevronLeft } from "lucide-react";
import Link from "next/link";

type ShoppingListProps = {
  groupId: Id<"groups">;
};

export function ShoppingList({ groupId }: ShoppingListProps) {
  const [showHistory, setShowHistory] = useState(false);

  const data = useQuery(api.shoppingList.list, { groupId });

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    );
  }

  const { pending, purchased } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            href={`/groups/${groupId}`}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">戻る</span>
          </Link>
          <h1 className="text-lg font-semibold">買い物リスト</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className={showHistory ? "text-blue-600" : "text-slate-600"}
            aria-label={showHistory ? "リストを表示" : "履歴を表示"}
          >
            {showHistory ? (
              <ShoppingCart className="h-5 w-5" />
            ) : (
              <History className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 space-y-4">
        {showHistory ? (
          <>
            <h2 className="text-sm font-medium text-slate-500">
              購入履歴（過去30日）
            </h2>
            <ShoppingHistory items={purchased} />
          </>
        ) : (
          <>
            {/* アイテム追加 */}
            <ShoppingItemInput groupId={groupId} />

            {/* アイテム一覧 */}
            {pending.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>買い物リストは空です</p>
                <p className="text-sm mt-1">
                  上の入力欄からアイテムを追加しましょう
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200">
                {pending.map((item) => (
                  <ShoppingItem key={item._id} item={item} mode="pending" />
                ))}
              </div>
            )}

            {/* アイテム数 */}
            {pending.length > 0 && (
              <p className="text-sm text-slate-500 text-center">
                {pending.length}件のアイテム
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

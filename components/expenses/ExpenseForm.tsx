"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
};

type Member = {
  userId: Id<"users">;
  displayName: string;
  isMe: boolean;
};

type ExpenseFormProps = {
  groupId: Id<"groups">;
  categories: Category[];
  members: Member[];
};

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function ExpenseForm({
  groupId,
  categories,
  members,
}: ExpenseFormProps) {
  const router = useRouter();
  const createExpense = useMutation(api.expenses.create);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | "">(
    categories[0]?._id ?? "",
  );
  const [paidBy, setPaidBy] = useState<Id<"users">>(
    members.find((m) => m.isMe)?.userId ?? members[0]?.userId,
  );
  const [date, setDate] = useState(getTodayString());
  const [memo, setMemo] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // クライアントサイドバリデーション
    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum < 1) {
      setError("金額を入力してください");
      return;
    }
    if (amountNum > 100_000_000) {
      setError("金額は1億円以下で入力してください");
      return;
    }
    if (!categoryId) {
      setError("カテゴリを選択してください");
      return;
    }
    if (!paidBy) {
      setError("支払者を選択してください");
      return;
    }
    if (!date) {
      setError("日付を選択してください");
      return;
    }

    setIsLoading(true);

    try {
      await createExpense({
        groupId,
        amount: amountNum,
        categoryId,
        paidBy,
        date,
        memo: memo.trim() || undefined,
      });

      // 成功したらグループ詳細に戻る
      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "支出の登録に失敗しました");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/groups/${groupId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 金額 */}
      <div className="space-y-2">
        <Label htmlFor="amount">金額</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            ¥
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            placeholder="1,500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
            min={1}
            max={100000000}
            required
          />
        </div>
      </div>

      {/* カテゴリ */}
      <div className="space-y-2">
        <Label htmlFor="category">カテゴリ</Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value as Id<"categories">)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          required
        >
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* 支払者 */}
      <div className="space-y-2">
        <Label htmlFor="paidBy">支払者</Label>
        <select
          id="paidBy"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value as Id<"users">)}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          required
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
              {member.isMe && " (自分)"}
            </option>
          ))}
        </select>
      </div>

      {/* 日付 */}
      <div className="space-y-2">
        <Label htmlFor="date">日付</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getTodayString()}
          required
        />
      </div>

      {/* 均等分割の説明 */}
      <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-md">
        ※ グループメンバー全員で均等に分割されます
      </div>

      {/* メモ */}
      <div className="space-y-2">
        <Label htmlFor="memo">メモ（任意）</Label>
        <Input
          id="memo"
          type="text"
          placeholder="ランチ代など"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* ボタン */}
      <div className="space-y-3 pt-4">
        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "登録中..." : "記録する"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
          onClick={handleCancel}
          disabled={isLoading}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

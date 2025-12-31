"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SplitMethodSelector,
  type SplitMethod,
  type SplitDetails,
} from "./SplitMethodSelector";

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

type InitialData = {
  expenseId: Id<"expenses">;
  amount: number;
  categoryId: Id<"categories">;
  paidBy: Id<"users">;
  date: string;
  memo?: string;
  splitMethod: "equal" | "ratio" | "amount" | "full";
  ratios?: { userId: Id<"users">; ratio: number }[];
  amounts?: { userId: Id<"users">; amount: number }[];
  bearerId?: Id<"users">;
};

type ExpenseFormProps = {
  groupId: Id<"groups">;
  categories: Category[];
  members: Member[];
  mode?: "create" | "edit";
  initialData?: InitialData;
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
  mode = "create",
  initialData,
}: ExpenseFormProps) {
  const router = useRouter();
  const createExpense = useMutation(api.expenses.create);
  const updateExpense = useMutation(api.expenses.update);

  const isEditMode = mode === "edit" && initialData;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(
    isEditMode ? String(initialData.amount) : "",
  );
  const [categoryId, setCategoryId] = useState<Id<"categories"> | "">(
    isEditMode ? initialData.categoryId : (categories[0]?._id ?? ""),
  );
  const [paidBy, setPaidBy] = useState<Id<"users">>(
    isEditMode
      ? initialData.paidBy
      : (members.find((m) => m.isMe)?.userId ?? members[0]?.userId),
  );
  const [date, setDate] = useState(
    isEditMode ? initialData.date : getTodayString(),
  );
  const [memo, setMemo] = useState(isEditMode ? (initialData.memo ?? "") : "");

  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    isEditMode ? initialData.splitMethod : "equal",
  );
  const [ratios, setRatios] = useState<Map<Id<"users">, number>>(() => {
    if (isEditMode && initialData.ratios) {
      const map = new Map<Id<"users">, number>();
      initialData.ratios.forEach((r) => map.set(r.userId, r.ratio));
      return map;
    }
    const defaultRatio = Math.floor(100 / members.length);
    const map = new Map<Id<"users">, number>();
    members.forEach((m, i) => {
      map.set(
        m.userId,
        i === 0 ? 100 - defaultRatio * (members.length - 1) : defaultRatio,
      );
    });
    return map;
  });
  const [amounts, setAmounts] = useState<Map<Id<"users">, number>>(() => {
    if (isEditMode && initialData.amounts) {
      const map = new Map<Id<"users">, number>();
      initialData.amounts.forEach((a) => map.set(a.userId, a.amount));
      return map;
    }
    const map = new Map<Id<"users">, number>();
    members.forEach((m) => map.set(m.userId, 0));
    return map;
  });
  const [bearerId, setBearerId] = useState<Id<"users"> | null>(
    isEditMode && initialData.bearerId ? initialData.bearerId : null,
  );

  const handleMethodChange = (newMethod: SplitMethod) => {
    setSplitMethod(newMethod);
    if (newMethod === "amount") {
      const amountNum = parseInt(amount, 10) || 0;
      if (amountNum > 0 && members.length > 0) {
        const baseAmount = Math.floor(amountNum / members.length);
        const remainder = amountNum % members.length;
        const newAmounts = new Map<Id<"users">, number>();
        members.forEach((m, i) => {
          newAmounts.set(m.userId, baseAmount + (i === 0 ? remainder : 0));
        });
        setAmounts(newAmounts);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    let splitDetails: SplitDetails;
    if (splitMethod === "equal") {
      splitDetails = { method: "equal" };
    } else if (splitMethod === "ratio") {
      const totalRatio = Array.from(ratios.values()).reduce(
        (sum, v) => sum + v,
        0,
      );
      if (totalRatio !== 100) {
        setError("割合の合計を100%にしてください");
        return;
      }
      splitDetails = {
        method: "ratio",
        ratios: Array.from(ratios.entries()).map(([userId, ratio]) => ({
          userId,
          ratio,
        })),
      };
    } else if (splitMethod === "amount") {
      const totalAmounts = Array.from(amounts.values()).reduce(
        (sum, v) => sum + v,
        0,
      );
      if (totalAmounts !== amountNum) {
        setError("金額の合計を支出金額と一致させてください");
        return;
      }
      splitDetails = {
        method: "amount",
        amounts: Array.from(amounts.entries()).map(([userId, amt]) => ({
          userId,
          amount: amt,
        })),
      };
    } else {
      if (!bearerId) {
        setError("全額負担者を選択してください");
        return;
      }
      splitDetails = { method: "full", bearerId };
    }

    setIsLoading(true);

    try {
      if (isEditMode) {
        await updateExpense({
          expenseId: initialData.expenseId,
          amount: amountNum,
          categoryId,
          paidBy,
          date,
          memo: memo.trim() || undefined,
          splitDetails,
        });
      } else {
        await createExpense({
          groupId,
          amount: amountNum,
          categoryId,
          paidBy,
          date,
          memo: memo.trim() || undefined,
          splitDetails,
        });
      }

      router.push(`/groups/${groupId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
            ? "支出の更新に失敗しました"
            : "支出の登録に失敗しました",
      );
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/groups/${groupId}`);
  };

  const isSplitValid = (): boolean => {
    if (splitMethod === "ratio") {
      const totalRatio = Array.from(ratios.values()).reduce(
        (sum, v) => sum + v,
        0,
      );
      return totalRatio === 100;
    }
    if (splitMethod === "amount") {
      const amountNum = parseInt(amount, 10) || 0;
      const totalAmounts = Array.from(amounts.values()).reduce(
        (sum, v) => sum + v,
        0,
      );
      return totalAmounts === amountNum && amountNum > 0;
    }
    if (splitMethod === "full") {
      return bearerId !== null;
    }
    return true;
  };

  const isFormValid =
    amount !== "" &&
    parseInt(amount, 10) >= 1 &&
    categoryId !== "" &&
    paidBy &&
    date !== "" &&
    isSplitValid();

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

      {/* 負担方法 */}
      <div className="space-y-2">
        <Label>負担方法</Label>
        <SplitMethodSelector
          method={splitMethod}
          onMethodChange={handleMethodChange}
          members={members}
          totalAmount={parseInt(amount, 10) || 0}
          ratios={ratios}
          onRatiosChange={setRatios}
          amounts={amounts}
          onAmountsChange={setAmounts}
          bearerId={bearerId}
          onBearerIdChange={setBearerId}
        />
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
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading || !isFormValid}
        >
          {isLoading
            ? isEditMode
              ? "更新中..."
              : "登録中..."
            : isEditMode
              ? "更新する"
              : "記録する"}
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

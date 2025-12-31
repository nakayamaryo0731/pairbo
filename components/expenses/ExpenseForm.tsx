"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  SplitMethodSelector,
  type SplitMethod,
  type SplitDetails,
} from "./SplitMethodSelector";
import { ShoppingItemSelector } from "./ShoppingItemSelector";

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
  title?: string;
  memo?: string;
  splitMethod: "equal" | "ratio" | "amount" | "full";
  ratios?: { userId: Id<"users">; ratio: number }[];
  amounts?: { userId: Id<"users">; amount: number }[];
  bearerId?: Id<"users">;
  splits?: { userId: Id<"users">; amount: number }[];
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
  const [title, setTitle] = useState(
    isEditMode ? (initialData.title ?? "") : "",
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<Id<"users">>>(
    () => {
      if (isEditMode && initialData.splits) {
        // 編集時: 負担額 > 0 のメンバーを選択
        const splitUserIds = initialData.splits
          .filter((s) => s.amount > 0)
          .map((s) => s.userId);
        return splitUserIds.length > 0
          ? new Set(splitUserIds)
          : new Set(members.map((m) => m.userId));
      }
      // 新規: 全員選択
      return new Set(members.map((m) => m.userId));
    },
  );
  const [shoppingItemIds, setShoppingItemIds] = useState<Id<"shoppingItems">[]>(
    [],
  );

  const handleMethodChange = (newMethod: SplitMethod) => {
    setSplitMethod(newMethod);
    if (newMethod === "amount") {
      const amountNum = parseInt(amount, 10) || 0;
      const selectedMembers = members.filter((m) =>
        selectedMemberIds.has(m.userId),
      );
      if (amountNum > 0 && selectedMembers.length > 0) {
        const baseAmount = Math.floor(amountNum / selectedMembers.length);
        const remainder = amountNum % selectedMembers.length;
        const newAmounts = new Map<Id<"users">, number>();
        selectedMembers.forEach((m, i) => {
          newAmounts.set(m.userId, baseAmount + (i === 0 ? remainder : 0));
        });
        setAmounts(newAmounts);
      }
    }
  };

  const handleSelectedMemberIdsChange = (newIds: Set<Id<"users">>) => {
    setSelectedMemberIds(newIds);
    // 選択メンバーが変わったら、割合と金額をリセット
    const selectedMembers = members.filter((m) => newIds.has(m.userId));
    // 割合: 選択メンバーで均等配分
    const defaultRatio = Math.floor(100 / selectedMembers.length);
    const newRatios = new Map<Id<"users">, number>();
    selectedMembers.forEach((m, i) => {
      newRatios.set(
        m.userId,
        i === 0
          ? 100 - defaultRatio * (selectedMembers.length - 1)
          : defaultRatio,
      );
    });
    setRatios(newRatios);
    // 金額: 選択メンバーで均等配分
    const amountNum = parseInt(amount, 10) || 0;
    if (amountNum > 0 && selectedMembers.length > 0) {
      const baseAmount = Math.floor(amountNum / selectedMembers.length);
      const remainder = amountNum % selectedMembers.length;
      const newAmounts = new Map<Id<"users">, number>();
      selectedMembers.forEach((m, i) => {
        newAmounts.set(m.userId, baseAmount + (i === 0 ? remainder : 0));
      });
      setAmounts(newAmounts);
    }
    // 全額負担者: 選択から外れたらリセット
    if (bearerId && !newIds.has(bearerId)) {
      setBearerId(null);
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

    // 選択メンバーのバリデーション
    if (selectedMemberIds.size === 0) {
      setError("少なくとも1人のメンバーを選択してください");
      return;
    }

    const selectedMemberIdArray = Array.from(selectedMemberIds);

    let splitDetails: SplitDetails;
    if (splitMethod === "equal") {
      splitDetails = { method: "equal", memberIds: selectedMemberIdArray };
    } else if (splitMethod === "ratio") {
      // 選択メンバーのみの割合をフィルタ
      const selectedRatios = Array.from(ratios.entries())
        .filter(([userId]) => selectedMemberIds.has(userId))
        .map(([userId, ratio]) => ({ userId, ratio }));
      const totalRatio = selectedRatios.reduce((sum, r) => sum + r.ratio, 0);
      if (totalRatio !== 100) {
        setError("割合の合計を100%にしてください");
        return;
      }
      splitDetails = {
        method: "ratio",
        ratios: selectedRatios,
      };
    } else if (splitMethod === "amount") {
      // 選択メンバーのみの金額をフィルタ
      const selectedAmounts = Array.from(amounts.entries())
        .filter(([userId]) => selectedMemberIds.has(userId))
        .map(([userId, amt]) => ({ userId, amount: amt }));
      const totalAmounts = selectedAmounts.reduce(
        (sum, a) => sum + a.amount,
        0,
      );
      if (totalAmounts !== amountNum) {
        setError("金額の合計を支出金額と一致させてください");
        return;
      }
      splitDetails = {
        method: "amount",
        amounts: selectedAmounts,
      };
    } else {
      if (!bearerId) {
        setError("全額負担者を選択してください");
        return;
      }
      if (!selectedMemberIds.has(bearerId)) {
        setError("全額負担者は選択メンバーから選んでください");
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
          title: title.trim() || undefined,
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
          title: title.trim() || undefined,
          memo: memo.trim() || undefined,
          splitDetails,
          shoppingItemIds:
            shoppingItemIds.length > 0 ? shoppingItemIds : undefined,
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
      {/* タイトル（任意） */}
      <div className="space-y-2">
        <Label htmlFor="title">タイトル（任意）</Label>
        <Input
          id="title"
          type="text"
          placeholder="例: スーパーで買い物"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
      </div>

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
        <Select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value as Id<"categories">)}
          required
        >
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.icon} {category.name}
            </option>
          ))}
        </Select>
      </div>

      {/* 支払者 */}
      <div className="space-y-2">
        <Label htmlFor="paidBy">支払者</Label>
        <Select
          id="paidBy"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value as Id<"users">)}
          required
        >
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.displayName}
              {member.isMe && " (自分)"}
            </option>
          ))}
        </Select>
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
          selectedMemberIds={selectedMemberIds}
          onSelectedMemberIdsChange={handleSelectedMemberIdsChange}
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

      {/* 買い物リスト連携（新規作成時のみ） */}
      {!isEditMode && (
        <ShoppingItemSelector
          groupId={groupId}
          selectedIds={shoppingItemIds}
          onSelectionChange={setShoppingItemIds}
        />
      )}

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

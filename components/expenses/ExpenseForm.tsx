"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  SplitMethodSelector,
  type SplitMethod,
  type SplitDetails,
} from "./SplitMethodSelector";
import { TagSelector } from "./TagSelector";
import { ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

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
  tagIds?: Id<"tags">[];
};

type ExpenseFormProps = {
  groupId: Id<"groups">;
  categories: Category[];
  members: Member[];
  mode?: "create" | "edit";
  initialData?: InitialData;
  isPremium?: boolean;
  linkedShoppingItems?: { _id: Id<"shoppingItems">; name: string }[];
  memberColors?: Record<string, string>;
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
  isPremium = false,
  linkedShoppingItems,
  memberColors,
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
  const [shoppingItemIds] = useState<Id<"shoppingItems">[]>([]);
  const [tagIds, setTagIds] = useState<Id<"tags">[]>(
    isEditMode && initialData.tagIds ? initialData.tagIds : [],
  );
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

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
          splitDetails,
          tagIds: tagIds.length > 0 ? tagIds : [],
        });
      } else {
        await createExpense({
          groupId,
          amount: amountNum,
          categoryId,
          paidBy,
          date,
          title: title.trim() || undefined,
          splitDetails,
          shoppingItemIds:
            shoppingItemIds.length > 0 ? shoppingItemIds : undefined,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-6 py-2">
      {/* 金額 - 大きく中央に */}
      <div className="text-center py-4">
        <div className="inline-flex items-baseline gap-1">
          <span className="text-3xl text-slate-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-5xl font-light text-slate-800 w-48 text-center bg-transparent border-none outline-none placeholder:text-slate-300"
            min={1}
            max={100000000}
            required
          />
        </div>
      </div>

      {/* タイトル + 日付 - 横並び */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="flex-1 min-w-0 py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getTodayString()}
          required
          className="shrink-0 py-3 px-3 bg-slate-50 rounded-xl border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-200 w-32"
        />
      </div>

      {/* カテゴリ - 横スクロールチップ */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          カテゴリ
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => setCategoryId(category._id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all shrink-0 ${
                categoryId === category._id
                  ? "bg-blue-500 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              <span>{category.icon}</span>
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 支払者 - 横スクロールチップ */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          支払った人
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {members.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => setPaidBy(member.userId)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                paidBy === member.userId
                  ? "bg-blue-500 text-white"
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"
              }`}
            >
              {memberColors?.[member.userId] && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                  style={{ backgroundColor: memberColors[member.userId] }}
                />
              )}
              {member.displayName}
              {member.isMe && " ✓"}
            </button>
          ))}
        </div>
      </div>

      {/* 負担方法 */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          負担方法
        </span>
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
          isPremium={isPremium}
          memberColors={memberColors}
        />
      </div>

      {/* タグ選択 */}
      <TagSelector
        groupId={groupId}
        selectedTagIds={tagIds}
        onSelectionChange={setTagIds}
        isPremium={isPremium}
        disabled={isLoading}
      />

      {/* 買い物リスト連携（現在非表示）
      {!isEditMode && (
        <ShoppingItemSelector
          groupId={groupId}
          selectedIds={shoppingItemIds}
          onSelectionChange={setShoppingItemIds}
        />
      )}
      */}

      {/* 連携した買い物リスト（編集時のみ） */}
      {isEditMode && linkedShoppingItems && linkedShoppingItems.length > 0 && (
        <div className="border border-blue-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsShoppingListOpen(!isShoppingListOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                連携した買い物リスト
              </span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {linkedShoppingItems.length}件
              </span>
            </div>
            {isShoppingListOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {isShoppingListOpen && (
            <div className="divide-y divide-slate-100 bg-white">
              {linkedShoppingItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="text-slate-400">🛒</span>
                  <span className="text-sm text-slate-700">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="flex-1 py-4 bg-blue-500 text-white font-medium rounded-2xl hover:bg-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? isEditMode
              ? "更新中..."
              : "登録中..."
            : isEditMode
              ? "更新する"
              : "記録する"}
        </button>
        <button
          type="button"
          className="px-6 py-4 text-sm text-slate-500 hover:text-slate-700 transition-colors rounded-2xl bg-slate-100 hover:bg-slate-200"
          onClick={handleCancel}
          disabled={isLoading}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

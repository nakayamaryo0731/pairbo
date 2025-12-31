"use client";

import type { Id } from "@/convex/_generated/dataModel";

export type SplitMethod = "equal" | "ratio" | "amount" | "full";

export type SplitDetails =
  | { method: "equal"; memberIds: Id<"users">[] }
  | { method: "ratio"; ratios: { userId: Id<"users">; ratio: number }[] }
  | { method: "amount"; amounts: { userId: Id<"users">; amount: number }[] }
  | { method: "full"; bearerId: Id<"users"> };

type Member = {
  userId: Id<"users">;
  displayName: string;
  isMe: boolean;
};

type SplitMethodSelectorProps = {
  method: SplitMethod;
  onMethodChange: (method: SplitMethod) => void;
  members: Member[];
  selectedMemberIds: Set<Id<"users">>;
  onSelectedMemberIdsChange: (ids: Set<Id<"users">>) => void;
  totalAmount: number;
  ratios: Map<Id<"users">, number>;
  onRatiosChange: (ratios: Map<Id<"users">, number>) => void;
  amounts: Map<Id<"users">, number>;
  onAmountsChange: (amounts: Map<Id<"users">, number>) => void;
  bearerId: Id<"users"> | null;
  onBearerIdChange: (bearerId: Id<"users">) => void;
};

const methodLabels: Record<SplitMethod, string> = {
  equal: "均等",
  ratio: "割合",
  amount: "金額",
  full: "全額",
};

export function SplitMethodSelector({
  method,
  onMethodChange,
  members,
  selectedMemberIds,
  onSelectedMemberIdsChange,
  totalAmount,
  ratios,
  onRatiosChange,
  amounts,
  onAmountsChange,
  bearerId,
  onBearerIdChange,
}: SplitMethodSelectorProps) {
  // 選択されたメンバーのみをフィルタ
  const selectedMembers = members.filter((m) =>
    selectedMemberIds.has(m.userId),
  );

  return (
    <div className="space-y-4">
      {/* メンバー選択 */}
      <MemberSelector
        members={members}
        selectedIds={selectedMemberIds}
        onChange={onSelectedMemberIdsChange}
      />

      {/* 分割方法選択 */}
      <div className="flex gap-2">
        {(["equal", "ratio", "amount", "full"] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md border transition-colors ${
              method === m
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
            }`}
            onClick={() => onMethodChange(m)}
          >
            {methodLabels[m]}
          </button>
        ))}
      </div>

      {/* 均等分割プレビュー */}
      {method === "equal" && selectedMembers.length > 0 && totalAmount > 0 && (
        <EqualPreview
          memberCount={selectedMembers.length}
          totalAmount={totalAmount}
        />
      )}

      {method === "ratio" && (
        <RatioInput
          members={selectedMembers}
          ratios={ratios}
          onRatiosChange={onRatiosChange}
        />
      )}

      {method === "amount" && (
        <AmountInput
          members={selectedMembers}
          totalAmount={totalAmount}
          amounts={amounts}
          onAmountsChange={onAmountsChange}
        />
      )}

      {method === "full" && (
        <FullInput
          members={selectedMembers}
          bearerId={bearerId}
          onBearerIdChange={onBearerIdChange}
        />
      )}
    </div>
  );
}

function RatioInput({
  members,
  ratios,
  onRatiosChange,
}: {
  members: Member[];
  ratios: Map<Id<"users">, number>;
  onRatiosChange: (ratios: Map<Id<"users">, number>) => void;
}) {
  const total = Array.from(ratios.values()).reduce((sum, v) => sum + v, 0);
  const isValid = total === 100;

  const handleRatioChange = (userId: Id<"users">, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    const newRatios = new Map(ratios);
    newRatios.set(userId, Math.max(0, Math.min(100, numValue)));
    onRatiosChange(newRatios);
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-md">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center gap-3">
          <span className="flex-1 text-sm">{member.displayName}</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              value={ratios.get(member.userId) ?? 0}
              onChange={(e) => handleRatioChange(member.userId, e.target.value)}
              className="w-16 h-8 px-2 text-right text-sm border border-slate-300 rounded-md"
              min={0}
              max={100}
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </div>
      ))}
      <div
        className={`text-sm text-right ${isValid ? "text-green-600" : "text-red-600"}`}
      >
        合計: {total}%{!isValid && " (100%にしてください)"}
      </div>
    </div>
  );
}

function AmountInput({
  members,
  totalAmount,
  amounts,
  onAmountsChange,
}: {
  members: Member[];
  totalAmount: number;
  amounts: Map<Id<"users">, number>;
  onAmountsChange: (amounts: Map<Id<"users">, number>) => void;
}) {
  const total = Array.from(amounts.values()).reduce((sum, v) => sum + v, 0);
  const remaining = totalAmount - total;
  const isValid = remaining === 0;

  const handleAmountChange = (userId: Id<"users">, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    const newAmounts = new Map(amounts);
    newAmounts.set(userId, Math.max(0, numValue));
    onAmountsChange(newAmounts);
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-md">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center gap-3">
          <span className="flex-1 text-sm">{member.displayName}</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">¥</span>
            <input
              type="number"
              inputMode="numeric"
              value={amounts.get(member.userId) ?? 0}
              onChange={(e) =>
                handleAmountChange(member.userId, e.target.value)
              }
              className="w-24 h-8 px-2 text-right text-sm border border-slate-300 rounded-md"
              min={0}
            />
          </div>
        </div>
      ))}
      <div
        className={`text-sm text-right ${isValid ? "text-green-600" : "text-red-600"}`}
      >
        合計: ¥{total.toLocaleString()} / ¥{totalAmount.toLocaleString()}
        {remaining !== 0 && ` (残り: ¥${remaining.toLocaleString()})`}
      </div>
    </div>
  );
}

function FullInput({
  members,
  bearerId,
  onBearerIdChange,
}: {
  members: Member[];
  bearerId: Id<"users"> | null;
  onBearerIdChange: (bearerId: Id<"users">) => void;
}) {
  return (
    <div className="space-y-2 p-3 bg-slate-50 rounded-md">
      <p className="text-sm text-slate-600">誰が全額負担しますか？</p>
      {members.map((member) => (
        <label
          key={member.userId}
          className="flex items-center gap-3 cursor-pointer"
        >
          <input
            type="radio"
            name="bearer"
            checked={bearerId === member.userId}
            onChange={() => onBearerIdChange(member.userId)}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm">{member.displayName}</span>
        </label>
      ))}
      {bearerId === null && (
        <p className="text-sm text-red-600">負担者を選択してください</p>
      )}
    </div>
  );
}

function MemberSelector({
  members,
  selectedIds,
  onChange,
}: {
  members: Member[];
  selectedIds: Set<Id<"users">>;
  onChange: (ids: Set<Id<"users">>) => void;
}) {
  const handleToggle = (userId: Id<"users">) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    onChange(newSet);
  };

  const isAllSelected = selectedIds.size === members.length;
  const isNoneSelected = selectedIds.size === 0;

  const handleSelectAll = () => {
    onChange(new Set(members.map((m) => m.userId)));
  };

  const handleDeselectAll = () => {
    onChange(new Set());
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">負担するメンバー</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            全選択
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={isNoneSelected}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            全解除
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => {
          const isSelected = selectedIds.has(member.userId);
          return (
            <button
              key={member.userId}
              type="button"
              onClick={() => handleToggle(member.userId)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                isSelected
                  ? "bg-blue-100 text-blue-700 border-blue-300"
                  : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
              }`}
            >
              {member.displayName}
              {member.isMe && " (自分)"}
            </button>
          );
        })}
      </div>
      <p
        className={`text-xs ${isNoneSelected ? "text-red-500" : "text-slate-500"}`}
      >
        {isNoneSelected
          ? "1人以上選択してください"
          : `${selectedIds.size}人で分割`}
      </p>
    </div>
  );
}

function EqualPreview({
  memberCount,
  totalAmount,
}: {
  memberCount: number;
  totalAmount: number;
}) {
  const perPerson = Math.floor(totalAmount / memberCount);
  const remainder = totalAmount % memberCount;

  return (
    <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-600">
      {memberCount}人で均等分割: 1人あたり ¥{perPerson.toLocaleString()}
      {remainder > 0 && (
        <span className="text-slate-500">
          {" "}
          (端数 ¥{remainder} は1人目に加算)
        </span>
      )}
    </div>
  );
}

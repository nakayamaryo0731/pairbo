"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { MemberExpenseDetail } from "./MemberExpenseDetail";

type Balance = {
  userId: Id<"users">;
  paid: number;
  owed: number;
  net: number;
  displayName: string;
};

type MemberBalanceListProps = {
  balances: Balance[];
  memberColors?: Record<string, string>;
  groupId?: Id<"groups">;
  year?: number;
  month?: number;
};

export function MemberBalanceList({
  balances,
  memberColors,
  groupId,
  year,
  month,
}: MemberBalanceListProps) {
  const [expanded, setExpanded] = useState<{
    memberId: Id<"users">;
    year: number;
    month: number;
  } | null>(null);

  const canExpand =
    groupId !== undefined && year !== undefined && month !== undefined;

  // 期間が変わると自動的にnullになる（useEffect不要）
  const expandedMemberId =
    expanded !== null && expanded.year === year && expanded.month === month
      ? expanded.memberId
      : null;

  const handleToggle = (userId: Id<"users">) => {
    if (!canExpand || year === undefined || month === undefined) return;
    setExpanded((prev) =>
      prev?.memberId === userId && prev.year === year && prev.month === month
        ? null
        : { memberId: userId, year, month },
    );
  };

  // net が大きい順（受け取る人が上）にソート
  const sortedBalances = [...balances].sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-2">
      {sortedBalances.map((balance) => (
        <div key={balance.userId}>
          <div
            role={canExpand ? "button" : undefined}
            tabIndex={canExpand ? 0 : undefined}
            onClick={() => handleToggle(balance.userId)}
            onKeyDown={
              canExpand
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggle(balance.userId);
                    }
                  }
                : undefined
            }
            className={`flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 ${
              canExpand
                ? "cursor-pointer active:bg-slate-100 transition-colors"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              {memberColors?.[balance.userId] && (
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: memberColors[balance.userId] }}
                />
              )}
              <span className="text-sm">{balance.displayName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-medium ${
                  balance.net > 0
                    ? "text-green-600"
                    : balance.net < 0
                      ? "text-red-600"
                      : "text-slate-500"
                }`}
              >
                {balance.net > 0 && "+"}¥{balance.net.toLocaleString()}
              </span>
              {canExpand &&
                (expandedMemberId === balance.userId ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ))}
            </div>
          </div>
          {expandedMemberId === balance.userId && canExpand && (
            <ExpandedDetail
              groupId={groupId}
              year={year}
              month={month}
              memberId={balance.userId}
              memberColors={memberColors}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedDetail({
  groupId,
  year,
  month,
  memberId,
  memberColors,
}: {
  groupId: Id<"groups">;
  year: number;
  month: number;
  memberId: Id<"users">;
  memberColors?: Record<string, string>;
}) {
  const data = useQuery(api.expenses.listByPeriod, { groupId, year, month });

  if (data === undefined) {
    return (
      <div className="flex justify-center py-3">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mt-1 ml-5 pl-3 border-l-2 border-slate-200">
      <MemberExpenseDetail
        memberId={memberId}
        expenses={data.expenses}
        memberColors={memberColors}
      />
    </div>
  );
}

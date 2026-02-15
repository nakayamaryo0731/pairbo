"use client";

import type { Id } from "@/convex/_generated/dataModel";

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
};

export function MemberBalanceList({
  balances,
  memberColors,
}: MemberBalanceListProps) {
  // net が大きい順（受け取る人が上）にソート
  const sortedBalances = [...balances].sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-2">
      {sortedBalances.map((balance) => (
        <div
          key={balance.userId}
          className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
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
        </div>
      ))}
    </div>
  );
}

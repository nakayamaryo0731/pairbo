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
};

export function MemberBalanceList({ balances }: MemberBalanceListProps) {
  // net が大きい順（受け取る人が上）にソート
  const sortedBalances = [...balances].sort((a, b) => b.net - a.net);

  return (
    <div className="space-y-2">
      {sortedBalances.map((balance) => (
        <div
          key={balance.userId}
          className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
        >
          <span className="text-sm">{balance.displayName}</span>
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

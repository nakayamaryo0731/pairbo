"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { formatPeriodLabel, formatPeriod } from "@/lib/formatters";

type SettlementCardProps = {
  settlement: {
    _id: Id<"settlements">;
    periodStart: string;
    periodEnd: string;
    status: "pending" | "settled";
    settledAt?: number;
    createdAt: number;
    paymentCount: number;
    paidCount: number;
  };
  groupId: Id<"groups">;
};

export function SettlementCard({ settlement, groupId }: SettlementCardProps) {
  const isSettled = settlement.status === "settled";

  return (
    <Link
      href={`/groups/${groupId}/settlements/${settlement._id}`}
      className="block bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-800">
            {formatPeriodLabel(settlement.periodEnd)}
          </div>
          <div className="text-sm text-slate-500">
            {formatPeriod(settlement.periodStart, settlement.periodEnd)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSettled ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              精算完了
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600 text-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              精算中 ({settlement.paidCount}/{settlement.paymentCount})
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

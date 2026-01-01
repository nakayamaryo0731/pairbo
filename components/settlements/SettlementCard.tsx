"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { formatPeriodLabel, formatPeriod } from "@/lib/formatters";
import { CircleCheck, Clock, ChevronRight } from "lucide-react";

type SettlementCardProps = {
  settlement: {
    _id: Id<"settlements">;
    periodStart: string;
    periodEnd: string;
    status: "pending" | "settled" | "reopened";
    settledAt?: number;
    createdAt: number;
    paymentCount: number;
    paidCount: number;
  };
  groupId: Id<"groups">;
};

export function SettlementCard({ settlement, groupId }: SettlementCardProps) {
  const statusLabel = () => {
    switch (settlement.status) {
      case "settled":
        return (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <CircleCheck className="h-4 w-4" />
            精算完了
          </span>
        );
      case "reopened":
        return (
          <span className="flex items-center gap-1 text-blue-600 text-sm">
            <Clock className="h-4 w-4" />
            再オープン
          </span>
        );
      case "pending":
      default:
        return (
          <span className="flex items-center gap-1 text-amber-600 text-sm">
            <Clock className="h-4 w-4" />
            精算中 ({settlement.paidCount}/{settlement.paymentCount})
          </span>
        );
    }
  };

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
          {statusLabel()}
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </Link>
  );
}

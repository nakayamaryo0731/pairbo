"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PaymentCard } from "./PaymentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw } from "lucide-react";
import { formatDateSlash, formatPeriodLabel } from "@/lib/formatters";

type SettlementDetailProps = {
  settlementId: Id<"settlements">;
};

export function SettlementDetail({ settlementId }: SettlementDetailProps) {
  const settlement = useQuery(api.settlements.getById, { settlementId });
  const reopenMutation = useMutation(api.settlements.reopen);
  const [isReopening, setIsReopening] = useState(false);

  if (settlement === undefined) {
    return <SettlementDetailSkeleton />;
  }

  const isSettled = settlement.status === "settled";

  const handleReopen = async () => {
    if (
      !confirm(
        "精算を未精算に戻しますか？すべての支払い完了状態がリセットされます。",
      )
    ) {
      return;
    }

    setIsReopening(true);
    try {
      await reopenMutation({ settlementId });
    } catch (error) {
      console.error("再オープンエラー:", error);
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー情報 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-slate-800">
            {formatPeriodLabel(settlement.periodEnd)}
          </h2>
          {isSettled ? (
            <span className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-2 py-1 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
            <span className="flex items-center gap-1 text-amber-600 text-sm bg-amber-50 px-2 py-1 rounded">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
              精算中
            </span>
          )}
        </div>

        <div className="text-sm text-slate-500 space-y-1">
          <div>
            期間: {formatDateSlash(settlement.periodStart)} 〜{" "}
            {formatDateSlash(settlement.periodEnd)}
          </div>
          <div>グループ: {settlement.groupName}</div>
          <div>確定者: {settlement.creatorName}</div>
        </div>

        {/* 精算完了時のオーナー向け再オープンボタン */}
        {isSettled && settlement.isOwner && (
          <button
            onClick={handleReopen}
            disabled={isReopening}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {isReopening ? "処理中..." : "未精算に戻す"}
          </button>
        )}
      </div>

      {/* 支払い一覧 */}
      <div>
        <h3 className="font-medium text-slate-800 mb-3">精算内容</h3>
        {settlement.payments.length > 0 ? (
          <div className="space-y-2">
            {settlement.payments.map((payment) => (
              <PaymentCard key={payment._id} payment={payment} />
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-slate-500 py-4 bg-white border border-slate-200 rounded-lg">
            支払いはありません（全員の収支が均等でした）
          </div>
        )}
      </div>
    </div>
  );
}

function SettlementDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      <div>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

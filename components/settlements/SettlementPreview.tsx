"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberBalanceList } from "./MemberBalanceList";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type SettlementPreviewProps = {
  groupId: Id<"groups">;
  year: number;
  month: number;
  isOwner: boolean;
};

export function SettlementPreview({
  groupId,
  year,
  month,
  isOwner,
}: SettlementPreviewProps) {
  const preview = useQuery(api.settlements.getPreview, {
    groupId,
    year,
    month,
  });
  const createSettlement = useMutation(api.settlements.create);
  const [isCreating, setIsCreating] = useState(false);

  if (preview === undefined) {
    return <SettlementPreviewSkeleton />;
  }

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      await createSettlement({ groupId, year, month });
    } finally {
      setIsCreating(false);
    }
  };

  const isAlreadySettled = preview.existingSettlementId !== null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      {/* 統計 */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-slate-500">支出数:</span>
          <span className="font-medium">{preview.totalExpenses}件</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">合計:</span>
          <span className="font-medium">
            ¥{preview.totalAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 収支一覧 */}
      {preview.balances.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            各メンバーの収支
          </h4>
          <MemberBalanceList balances={preview.balances} />
        </div>
      )}

      {/* 精算方法 */}
      {preview.payments.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">精算方法</h4>
          <div className="space-y-2">
            {preview.payments.map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
              >
                <span className="text-sm">
                  {payment.fromUserName} → {payment.toUserName}
                </span>
                <span className="font-medium">
                  ¥{payment.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 精算確定ボタン */}
      {isOwner && !isAlreadySettled && (
        <Button
          onClick={handleConfirm}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? "確定中..." : "精算を確定"}
        </Button>
      )}

      {/* 精算済みの場合 */}
      {isAlreadySettled && (
        <div className="text-center text-sm text-slate-500 py-2">
          この期間は精算済みです
        </div>
      )}

      {/* 支出がない場合 */}
      {preview.totalExpenses === 0 && !isAlreadySettled && (
        <div className="text-center text-sm text-slate-500 py-2">
          この期間の支出はありません
        </div>
      )}
    </div>
  );
}

function SettlementPreviewSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

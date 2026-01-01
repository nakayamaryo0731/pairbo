"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatTimestamp, formatAmount } from "@/lib/formatters";
import { CircleCheck, Circle } from "lucide-react";

type PaymentCardProps = {
  payment: {
    _id: Id<"settlementPayments">;
    fromUserId: Id<"users">;
    fromUserName: string;
    toUserId: Id<"users">;
    toUserName: string;
    amount: number;
    isPaid: boolean;
    paidAt?: number;
    canMarkPaid: boolean;
  };
};

export function PaymentCard({ payment }: PaymentCardProps) {
  const markPaid = useMutation(api.settlements.markPaid);
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkPaid = async () => {
    setIsMarking(true);
    try {
      await markPaid({ paymentId: payment._id });
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600">
          {payment.fromUserName} → {payment.toUserName}
        </span>
        <span className="font-medium">¥{formatAmount(payment.amount)}</span>
      </div>

      {payment.isPaid ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CircleCheck className="h-4 w-4" />
          <span>支払い済み</span>
          {payment.paidAt && (
            <span className="text-slate-400">
              ({formatTimestamp(payment.paidAt)})
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Circle className="h-4 w-4" />
            <span>未払い</span>
          </div>
          {payment.canMarkPaid && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkPaid}
              disabled={isMarking}
            >
              {isMarking ? "処理中..." : "支払い完了にする"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

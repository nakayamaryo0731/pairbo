"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { formatTimestamp, formatAmount } from "@/lib/formatters";

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
            </svg>
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

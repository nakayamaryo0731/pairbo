"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberBalanceList } from "./MemberBalanceList";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { useState, useMemo } from "react";
import { ChevronRight, X, ArrowRightToLine } from "lucide-react";
import { buildMemberColorMap } from "@/lib/userColors";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PayPayButton } from "./PayPayButton";
import { trackEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";
import { MemberNameLabel } from "@/components/ui/MemberNameLabel";

type SettlementPreviewProps = {
  groupId: Id<"groups">;
  year: number;
  month: number;
  compact?: boolean;
  memberColors?: Record<string, string>;
};

export function SettlementPreview({
  groupId,
  year,
  month,
  compact = false,
  memberColors: externalMemberColors,
}: SettlementPreviewProps) {
  const preview = useQuery(api.settlements.getPreview, {
    groupId,
    year,
    month,
  });
  const groupDetail = useQuery(
    api.groups.getDetail,
    externalMemberColors ? "skip" : { groupId },
  );
  const memberColors = useMemo(
    () =>
      externalMemberColors ??
      (groupDetail ? buildMemberColorMap(groupDetail.members) : {}),
    [externalMemberColors, groupDetail],
  );

  if (preview === undefined) {
    return <SettlementPreviewSkeleton />;
  }

  if (compact) {
    return (
      <CompactSettlement
        preview={preview}
        memberColors={memberColors}
        groupId={groupId}
        year={year}
        month={month}
      />
    );
  }

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

      <CarryoverNote carryover={preview.carryover} />

      {/* 収支一覧 */}
      {preview.balances.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            各メンバーの収支
          </h4>
          <MemberBalanceList
            balances={preview.balances}
            memberColors={memberColors}
            groupId={groupId}
            year={year}
            month={month}
          />
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
                <span className="text-sm flex items-center gap-1">
                  {memberColors[payment.fromUserId] && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: memberColors[payment.fromUserId],
                      }}
                    />
                  )}
                  <MemberNameLabel
                    name={payment.fromUserName}
                    color={memberColors[payment.fromUserId]}
                  />
                  {" → "}
                  {memberColors[payment.toUserId] && (
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: memberColors[payment.toUserId],
                      }}
                    />
                  )}
                  <MemberNameLabel
                    name={payment.toUserName}
                    color={memberColors[payment.toUserId]}
                  />
                </span>
                <span className="font-medium">
                  ¥{payment.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CarryoverActions
        preview={preview}
        groupId={groupId}
        year={year}
        month={month}
      />

      {/* 支出がない場合 */}
      {preview.totalExpenses === 0 && !preview.carryover && (
        <div className="text-center text-sm text-slate-500 py-2">
          この期間の支出はありません
        </div>
      )}
    </div>
  );
}

type PreviewData = {
  totalExpenses: number;
  totalAmount: number;
  balances: {
    userId: Id<"users">;
    displayName: string;
    net: number;
    paid: number;
    owed: number;
  }[];
  payments: {
    fromUserId: Id<"users">;
    fromUserName: string;
    toUserId: Id<"users">;
    toUserName: string;
    amount: number;
  }[];
  existingSettlementId: Id<"settlements"> | null;
  existingSettlementStatus:
    "pending" | "settled" | "reopened" | "carried_over" | null;
  canCancelCarryover: boolean;
  carryover: {
    settlementId: Id<"settlements">;
    amount: number;
    periodStart: string;
    periodEnd: string;
  } | null;
};

/** 前の期間からの繰越を含むことの注記 */
function CarryoverNote({ carryover }: { carryover: PreviewData["carryover"] }) {
  if (!carryover) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
      <ArrowRightToLine className="w-3.5 h-3.5 shrink-0" />
      先月までの繰越 ¥{carryover.amount.toLocaleString()} を含んでいます
    </div>
  );
}

/**
 * 繰り越し操作（実行 / 繰越済み表示 + 取り消し）
 */
function CarryoverActions({
  preview,
  groupId,
  year,
  month,
  onDone,
}: {
  preview: PreviewData;
  groupId: Id<"groups">;
  year: number;
  month: number;
  onDone?: () => void;
}) {
  const carryOver = useMutation(api.settlements.carryOver);
  const cancelCarryOver = useMutation(api.settlements.cancelCarryOver);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCarriedOver = preview.existingSettlementStatus === "carried_over";
  const totalPayment = preview.payments.reduce((sum, p) => sum + p.amount, 0);

  const handleCarryOver = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await carryOver({ groupId, year, month });
      trackEvent("carry_over_settlement");
      setConfirmOpen(false);
      onDone?.();
    } catch (e) {
      setError(getErrorMessage(e, "繰り越しに失敗しました"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!preview.existingSettlementId) return;
    setIsLoading(true);
    setError(null);
    try {
      await cancelCarryOver({ settlementId: preview.existingSettlementId });
      onDone?.();
    } catch (e) {
      setError(getErrorMessage(e, "取り消しに失敗しました"));
    } finally {
      setIsLoading(false);
    }
  };

  // 繰越済み: 状態表示 + 取り消し
  if (isCarriedOver) {
    return (
      <div className="mb-1">
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="flex items-center gap-1.5 text-sm text-amber-700">
            <ArrowRightToLine className="w-4 h-4 shrink-0" />
            この期間の差額は翌月に繰り越されています
          </span>
          {preview.canCancelCarryover && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0 disabled:opacity-50"
            >
              取り消す
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // 未確定 & 差額あり: 繰り越しボタン
  if (preview.existingSettlementId !== null || preview.payments.length === 0) {
    return null;
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <ArrowRightToLine className="w-4 h-4" />
        翌月に繰り越す
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}

      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="翌月に繰り越す"
        description={`この期間の差額 ¥${totalPayment.toLocaleString()} を支払わず、翌月の精算に合算します。`}
        onConfirm={handleCarryOver}
        isLoading={isLoading}
        confirmLabel="繰り越す"
        confirmLoadingLabel="処理中..."
        variant="default"
      />
    </div>
  );
}

type CompactSettlementProps = {
  preview: PreviewData;
  memberColors: Record<string, string>;
  groupId: Id<"groups">;
  year: number;
  month: number;
};

function CompactSettlement({
  preview,
  memberColors,
  groupId,
  year,
  month,
}: CompactSettlementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();

  const isCarriedOver = preview.existingSettlementStatus === "carried_over";

  return (
    <>
      {/* コンパクト表示（カード風） */}
      <button
        onClick={() => setModalOpen(true)}
        className="w-full bg-white border border-slate-200 rounded-lg p-3 text-left relative"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            精算
            {isCarriedOver && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-px">
                翌月へ繰越済み
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
        {preview.payments.length > 0 ? (
          <div className="space-y-1.5">
            {preview.payments.slice(0, 3).map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-700 flex items-center gap-1">
                  {memberColors[payment.fromUserId] && (
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: memberColors[payment.fromUserId],
                      }}
                    />
                  )}
                  <MemberNameLabel
                    name={payment.fromUserName}
                    color={memberColors[payment.fromUserId]}
                  />
                  {" → "}
                  <MemberNameLabel
                    name={payment.toUserName}
                    color={memberColors[payment.toUserId]}
                  />
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-800">
                    ¥{payment.amount.toLocaleString()}
                  </span>
                  {isMobile && !isCarriedOver && (
                    <a
                      href="paypay://"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await navigator.clipboard.writeText(
                          String(payment.amount),
                        );
                        trackEvent("paypay_transfer");
                      }}
                      className="text-[10px] font-bold text-[#FF0033] hover:bg-[#FF0033]/10 px-1.5 py-0.5 rounded"
                    >
                      PayPay
                    </a>
                  )}
                </span>
              </div>
            ))}
            {preview.payments.length > 3 && (
              <div className="text-xs text-blue-600">
                他{preview.payments.length - 3}件の精算
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-500">精算なし</span>
        )}
      </button>

      {/* モーダル（ボトムシート） */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-4 max-h-[80dvh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                精算の詳細
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
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

              <CarryoverNote carryover={preview.carryover} />

              {preview.balances.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-2">
                    各メンバーの収支
                  </h4>
                  <MemberBalanceList
                    balances={preview.balances}
                    memberColors={memberColors}
                    groupId={groupId}
                    year={year}
                    month={month}
                  />
                </div>
              )}

              {preview.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-600 mb-2">
                    精算方法
                  </h4>
                  <div className="space-y-2">
                    {preview.payments.map((payment, index) => (
                      <div
                        key={index}
                        className="bg-slate-50 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center gap-1">
                            {memberColors[payment.fromUserId] && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    memberColors[payment.fromUserId],
                                }}
                              />
                            )}
                            <MemberNameLabel
                              name={payment.fromUserName}
                              color={memberColors[payment.fromUserId]}
                            />
                            {" → "}
                            {memberColors[payment.toUserId] && (
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    memberColors[payment.toUserId],
                                }}
                              />
                            )}
                            <MemberNameLabel
                              name={payment.toUserName}
                              color={memberColors[payment.toUserId]}
                            />
                          </span>
                          <span className="font-medium">
                            ¥{payment.amount.toLocaleString()}
                          </span>
                        </div>
                        {isMobile && !isCarriedOver && (
                          <div className="mt-2">
                            <PayPayButton amount={payment.amount} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CarryoverActions
                preview={preview}
                groupId={groupId}
                year={year}
                month={month}
              />
            </div>
          </div>
        </div>
      )}
    </>
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

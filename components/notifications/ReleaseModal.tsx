"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { X, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Release } from "@/lib/releases";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { trackEvent } from "@/lib/analytics";
import { getErrorMessage } from "@/lib/errors";

type ReleaseModalProps = {
  release: Release;
  /** ユーザーが既に trial を取得済みか（claimTrial の事前判定に使用） */
  trialClaimed: boolean;
  onClose: () => void;
  onBack: () => void;
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function ReleaseModal({
  release,
  trialClaimed,
  onClose,
  onBack,
}: ReleaseModalProps) {
  const claimTrial = useMutation(api.subscriptions.claimTrial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 直前に claim した直後はサーバ側 query 反映前なので、ローカルフラグも持っておく
  const [justClaimed, setJustClaimed] = useState(false);

  const showSuccess = trialClaimed || justClaimed;

  const handleClaim = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await claimTrial();
      if (result.granted) {
        trackEvent("trial_claimed", { source: "release_modal" });
        setJustClaimed(true);
      } else {
        setError(
          result.reason === "already_claimed"
            ? "無料体験はすでにご利用済みです"
            : "Premiumをご利用中のため、無料体験の対象外です",
        );
      }
    } catch (err) {
      setError(getErrorMessage(err, "エラーが発生しました"));
    } finally {
      setIsLoading(false);
    }
  };

  const hasClaimTrialCta = release.cta?.action === "claim_trial";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl p-5 max-h-[90dvh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between mb-3">
          <time className="text-xs text-slate-400">
            {formatDate(release.publishedAt)}
          </time>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 text-slate-400 hover:text-slate-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          {release.title}
        </h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
          {release.body}
        </p>

        {hasClaimTrialCta && release.cta && (
          <div className="mt-5">
            <ErrorAlert message={error} className="rounded-md mb-3" />
            {showSuccess ? (
              <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <Sparkles className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">
                  Premium プラン 30日間無料体験中です
                </p>
              </div>
            ) : (
              <Button
                type="button"
                className="w-full"
                onClick={handleClaim}
                disabled={isLoading}
              >
                {isLoading ? "処理中..." : release.cta.label}
              </Button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full py-3 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
        >
          ← 一覧に戻る
        </button>
      </div>
    </div>
  );
}

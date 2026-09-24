"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { clearLastGroupId } from "@/lib/lastGroup";

/**
 * グループ削除済み・脱退済み・不正IDによるアクセスエラー。
 * lastGroupIdが古い場合に発生するため、記録をクリアして一覧に戻す。
 */
const GROUP_ACCESS_ERROR_MESSAGES = [
  "このグループにアクセスする権限がありません",
  "グループが見つかりません",
];

export default function GroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const isGroupAccessError = GROUP_ACCESS_ERROR_MESSAGES.some((message) =>
    error.message.includes(message),
  );

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  useEffect(() => {
    if (!isGroupAccessError) return;
    clearLastGroupId();
    router.replace("/groups?list=true");
  }, [isGroupAccessError, router]);

  if (isGroupAccessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">グループ一覧に戻ります...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-lg font-bold text-slate-800 mb-2">
          エラーが発生しました
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          時間をおいて再度お試しください。
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
          >
            再読み込み
          </button>
          <button
            onClick={() => router.push("/groups?list=true")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            グループ一覧へ
          </button>
        </div>
      </div>
    </div>
  );
}

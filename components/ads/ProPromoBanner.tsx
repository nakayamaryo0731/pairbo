"use client";

import Link from "next/link";

/**
 * Proプランへの誘導バナー
 * Freeユーザー・未ログインユーザーに表示
 */
export function ProPromoBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-linear-to-r from-slate-50 to-slate-100 shadow-lg">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-sm text-slate-600">広告なしでもっと快適に</span>
        </div>
        <Link
          href="/pricing"
          className="rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Proプラン
        </Link>
      </div>
    </div>
  );
}

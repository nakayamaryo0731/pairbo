"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <WifiOff className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          オフラインです
        </h1>
        <p className="text-slate-500 mb-8">
          インターネットに接続されていません。
          <br />
          接続を確認して、もう一度お試しください。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          再読み込み
        </button>
      </div>
    </div>
  );
}

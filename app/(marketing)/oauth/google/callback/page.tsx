"use client";

import { useEffect, useState } from "react";

/**
 * Google OAuth コールバックページ
 *
 * ポップアップで開かれ、URLクエリの code/state を親ウィンドウに postMessage で渡してから閉じる。
 * window.opener が null の場合（別タブで開かれた等）はユーザー向けの案内を表示する。
 */
export default function GoogleOAuthCallbackPage() {
  // SSR時は true (デフォルト案内のみ)、CSRで window.opener を判定
  const [hasOpener] = useState(() =>
    typeof window === "undefined" ? true : !!window.opener,
  );

  useEffect(() => {
    if (!window.opener) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      window.opener.postMessage(
        { type: "pairbo-google-oauth", ok: false, error },
        window.location.origin,
      );
      window.close();
      return;
    }

    if (!code || !state) {
      window.opener.postMessage(
        {
          type: "pairbo-google-oauth",
          ok: false,
          error: "missing_code_or_state",
        },
        window.location.origin,
      );
      window.close();
      return;
    }

    window.opener.postMessage(
      { type: "pairbo-google-oauth", ok: true, code, state },
      window.location.origin,
    );
    window.close();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="text-center max-w-sm">
        {hasOpener ? (
          <p className="text-slate-600">
            処理中です。このウィンドウは自動で閉じます…
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-800 font-medium">
              このタブを閉じてください
            </p>
            <p className="text-sm text-slate-600">
              ブラウザの仕様で別タブで開かれました。このタブを閉じてPairboに戻り、再度エクスポートを試してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function TestPaymentPage() {
  const subscription = useQuery(api.subscriptions.getMySubscription);
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortal = useAction(api.subscriptions.createPortalSession);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (priceType: "monthly" | "yearly") => {
    setLoading(true);
    try {
      const { url } = await createCheckout({
        priceType,
        successUrl: `${window.location.origin}/test-payment?success=true`,
        cancelUrl: `${window.location.origin}/test-payment?canceled=true`,
      });
      window.location.href = url;
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { url } = await createPortal({
        returnUrl: `${window.location.origin}/test-payment`,
      });
      window.location.href = url;
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-md">
        <h1 className="mb-8 text-2xl font-bold">決済テスト</h1>

        {/* 現在のプラン */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">現在のプラン</h2>
          {subscription ? (
            <div className="space-y-2">
              <p>
                プラン:{" "}
                <span className="font-bold">
                  {subscription.plan === "pro" ? "Pro" : "Free"}
                </span>
              </p>
              {subscription.status && <p>ステータス: {subscription.status}</p>}
              {subscription.currentPeriodEnd && (
                <p>
                  有効期限:{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              {subscription.cancelAtPeriodEnd && (
                <p className="text-orange-600">※ 期間終了時にキャンセル予定</p>
              )}
            </div>
          ) : (
            <p className="text-slate-500">読み込み中...</p>
          )}
        </div>

        {/* アクション */}
        <div className="space-y-4">
          {subscription?.plan === "free" ? (
            <>
              <button
                onClick={() => handleCheckout("monthly")}
                disabled={loading}
                className="w-full rounded-lg bg-blue-500 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "処理中..." : "月額プラン (¥300/月)"}
              </button>
              <button
                onClick={() => handleCheckout("yearly")}
                disabled={loading}
                className="w-full rounded-lg bg-green-500 py-3 font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? "処理中..." : "年額プラン (¥2,400/年)"}
              </button>
            </>
          ) : (
            <button
              onClick={handlePortal}
              disabled={loading}
              className="w-full rounded-lg bg-slate-700 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "処理中..." : "プラン管理"}
            </button>
          )}
        </div>

        {/* テストカード情報 */}
        <div className="mt-8 rounded-lg bg-yellow-50 p-4 text-sm">
          <h3 className="mb-2 font-semibold text-yellow-800">
            テスト用カード情報
          </h3>
          <ul className="space-y-1 text-yellow-700">
            <li>カード番号: 4242 4242 4242 4242</li>
            <li>有効期限: 任意の未来日付</li>
            <li>CVC: 任意の3桁</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

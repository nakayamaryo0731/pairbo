"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppHeader } from "@/components/ui/AppHeader";
import { UserButton } from "@clerk/nextjs";

type PriceType = "monthly" | "yearly";

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useConvexAuth();
  const subscription = useQuery(
    api.subscriptions.getMySubscription,
    isAuthenticated ? {} : "skip",
  );
  const createCheckout = useAction(api.subscriptions.createCheckoutSession);
  const createPortal = useAction(api.subscriptions.createPortalSession);
  const [loading, setLoading] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceType>("yearly");

  const isPremium = subscription?.plan === "premium";

  const handleCheckout = async (priceType: PriceType) => {
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    setLoading(true);
    try {
      const { url } = await createCheckout({
        priceType,
        successUrl: `${window.location.origin}/pricing?success=true`,
        cancelUrl: `${window.location.origin}/pricing`,
      });
      window.location.href = url;
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { url } = await createPortal({
        returnUrl: `${window.location.origin}/pricing`,
      });
      window.location.href = url;
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader rightElement={isAuthenticated ? <UserButton /> : undefined} />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              料金プラン
            </h1>
            <p className="text-slate-600">
              あなたに合ったプランをお選びください
            </p>
          </div>

          {/* 成功メッセージ */}
          {searchParams.get("success") && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-center font-medium">
                Premiumプランへのアップグレードありがとうございます！
              </p>
            </div>
          )}

          {/* 決済失敗警告 */}
          {isAuthenticated && subscription?.status === "past_due" && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 font-medium mb-2">
                お支払いに問題が発生しています
              </p>
              <p className="text-amber-700 text-sm mb-3">
                お支払い情報を更新してください。更新されない場合、Premium機能が制限されます。
              </p>
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "処理中..." : "お支払い情報を更新"}
              </button>
            </div>
          )}

          {/* 現在のプラン（ログイン済みの場合） */}
          {isAuthenticated && subscription && (
            <div className="mb-6 p-4 bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">現在のプラン</p>
                  <p className="font-bold text-slate-800">
                    {subscription.plan === "premium" ? "Premium" : "Free"}
                  </p>
                </div>
                {subscription.plan === "premium" && (
                  <div className="text-right">
                    {subscription.currentPeriodEnd && (
                      <p className="text-xs text-slate-500">
                        {subscription.cancelAtPeriodEnd
                          ? "終了予定"
                          : "次回更新"}
                        :{" "}
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* プランカード */}
          <div className="space-y-4">
            {/* Free プラン */}
            <div
              className={`bg-white border rounded-xl p-6 ${!isPremium ? "border-slate-200" : "border-slate-100 opacity-60"}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Free</h2>
                <span className="text-2xl font-bold text-slate-800">¥0</span>
              </div>
              <ul className="space-y-3 mb-6 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>支出記録・精算機能</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>グループ作成・招待</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>買い物リスト</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>負担方法（均等・全額）</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  <span>月次分析グラフ</span>
                </li>
              </ul>
              {!isPremium && (
                <div className="text-center text-sm text-slate-500">
                  現在ご利用中
                </div>
              )}
            </div>

            {/* Premium プラン */}
            <div
              className={`bg-white border-2 rounded-xl p-6 relative ${isPremium ? "border-emerald-500" : "border-slate-800"}`}
            >
              {!isPremium && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-slate-800 text-white text-xs font-medium px-3 py-1 rounded-full">
                    おすすめ
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Premium</h2>
                <div className="text-right">
                  {selectedPrice === "monthly" ? (
                    <>
                      <span className="text-2xl font-bold text-slate-800">
                        ¥300
                      </span>
                      <span className="text-slate-500">/月</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-slate-800">
                        ¥2,400
                      </span>
                      <span className="text-slate-500">/年</span>
                      <p className="text-xs text-emerald-600">月額¥200相当</p>
                    </>
                  )}
                </div>
              </div>
              {!isPremium && (
                <div className="flex mb-4 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setSelectedPrice("monthly")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedPrice === "monthly"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    月払い
                  </button>
                  <button
                    onClick={() => setSelectedPrice("yearly")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                      selectedPrice === "yearly"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    年払い
                    <span className="ml-1 text-xs text-emerald-500">
                      2ヶ月分お得
                    </span>
                  </button>
                </div>
              )}
              <ul className="space-y-3 mb-6 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-emerald-500" />
                  <span>Freeプランの全機能</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-emerald-500" />
                  <span>傾斜折半（割合・金額指定）</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-emerald-500" />
                  <span>年次分析・月別推移グラフ</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-emerald-500" />
                  <span>広告非表示</span>
                </li>
              </ul>
              {isPremium ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? "処理中..." : "プランを管理"}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(selectedPrice)}
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? "処理中..."
                    : isAuthenticated
                      ? "Premiumにアップグレード"
                      : "ログインしてアップグレード"}
                </button>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-8 space-y-4">
            <h3 className="font-bold text-slate-800">よくある質問</h3>
            <div className="space-y-3">
              <FaqItem
                question="いつでも解約できますか？"
                answer="はい、いつでも解約できます。解約後も期間終了まではPremiumプランをご利用いただけます。"
              />
              <FaqItem
                question="支払い方法は何が使えますか？"
                answer="クレジットカード（Visa、Mastercard、American Express、JCB）がご利用いただけます。"
              />
              <FaqItem
                question="年払いから月払いに変更できますか？"
                answer="Stripe Customer Portalからプランの変更が可能です。"
              />
            </div>
          </div>

          {/* 戻るボタン */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-slate-600 hover:text-slate-800 text-sm"
            >
              ← ホームに戻る
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function CheckIcon({ className = "text-slate-400" }: { className?: string }) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <span className="font-medium text-slate-800">{question}</span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-slate-600">{answer}</div>
      )}
    </div>
  );
}

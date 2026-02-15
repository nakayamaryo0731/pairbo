"use client";

import Link from "next/link";

type MockAdBannerProps = {
  /** TabNavigationの上に配置する場合はtrue */
  aboveTabNav?: boolean;
};

// モック広告データ
const mockAds = [
  {
    icon: "🏦",
    title: "スマート家計簿Pro",
    description: "AIで支出を自動分類",
    cta: "無料で始める",
    bgColor: "bg-blue-50",
    accentColor: "text-blue-600",
  },
  {
    icon: "💳",
    title: "ポイント還元カード",
    description: "最大5%還元キャンペーン中",
    cta: "詳しく見る",
    bgColor: "bg-emerald-50",
    accentColor: "text-emerald-600",
  },
  {
    icon: "📊",
    title: "投資アプリ INVEST",
    description: "100円から始める資産運用",
    cta: "口座開設",
    bgColor: "bg-purple-50",
    accentColor: "text-purple-600",
  },
  {
    icon: "🏠",
    title: "住宅ローン比較",
    description: "最低金利0.3%〜",
    cta: "シミュレーション",
    bgColor: "bg-orange-50",
    accentColor: "text-orange-600",
  },
  {
    icon: "💰",
    title: "貯金アプリ SAVE",
    description: "目標貯金を楽しくサポート",
    cta: "ダウンロード",
    bgColor: "bg-pink-50",
    accentColor: "text-pink-600",
  },
];

// 時間ベースで広告を選択（1時間ごとに切り替わる）
function getAdByTime(): (typeof mockAds)[number] {
  const hour = new Date().getHours();
  return mockAds[hour % mockAds.length];
}

/**
 * モック広告バナー
 * - 実際の広告っぽい見た目でUXをテスト
 * - 時間ベースで広告を切り替え
 */
export function MockAdBanner({ aboveTabNav = false }: MockAdBannerProps) {
  const ad = getAdByTime();

  return (
    <div
      className={`fixed left-0 right-0 z-40 border-t border-slate-200 ${ad.bgColor} shadow-lg ${
        aboveTabNav ? "bottom-14" : "bottom-0"
      }`}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {/* 広告ラベル */}
        <span className="absolute left-1 top-1 rounded bg-slate-400 px-1 text-[10px] font-medium text-white">
          AD
        </span>

        {/* 広告コンテンツ */}
        <div className="flex flex-1 items-center gap-3 pl-6">
          <span className="text-2xl">{ad.icon}</span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-medium ${ad.accentColor}`}>
              {ad.title}
            </p>
            <p className="truncate text-xs text-slate-500">{ad.description}</p>
          </div>
        </div>

        {/* CTA + 広告を消すリンク */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            className={`rounded-full ${ad.bgColor} border border-current px-3 py-1 text-xs font-medium ${ad.accentColor}`}
            onClick={() => {
              // モックなのでクリックしても何もしない
            }}
          >
            {ad.cta}
          </button>
          <Link
            href="/pricing"
            className="text-[10px] text-slate-400 underline hover:text-slate-600"
          >
            広告を消す
          </Link>
        </div>
      </div>
    </div>
  );
}

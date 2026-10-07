import type { Metadata } from "next";
import { LandingPage } from "@/components/landing";

// canonicalはルートlayoutに置くと全ページが「正規URL=トップ」になり他ページがインデックスされないため、LPにだけ設定する
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

// 構造化データはページに表示している内容と一致させる必要があるため、LPのFAQと同じ文言にしてLPにだけ出す
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "本当に無料で使えますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "基本機能はすべて無料です。傾斜折半や定期支出の自動記録、詳細分析が使えるPremiumプラン（月額¥100・年額¥1,000）もあります。Premiumは、どちらか1人が課金すればグループ全員が使えます。",
      },
    },
    {
      "@type": "Question",
      name: "家賃やサブスクなど、毎月決まった支出はどう記録しますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "定期支出として登録すると、毎月決まった日に自動で記録されます（Premium機能）。",
      },
    },
    {
      "@type": "Question",
      name: "アプリのインストールは必要ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "不要です。ブラウザからアクセスするだけで使えます。スマホのホーム画面に追加すれば、アプリのように使うこともできます。",
      },
    },
    {
      "@type": "Question",
      name: "同棲の生活費はどうやって分担できますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "均等割り・割合指定（傾斜折半）・金額指定・全額負担の4つの方法から選べます。収入差があるカップルでも、ふたりに合った負担バランスを設定できます。",
      },
    },
    {
      "@type": "Question",
      name: "共同口座やクレジットカードは必要ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "いいえ。お財布は別々のままでOKです。それぞれが支払った支出を記録し、月ごとに差額を精算する仕組みです。",
      },
    },
    {
      "@type": "Question",
      name: "パートナーにどうやって共有しますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "招待URLを送るだけです。相手はブラウザからすぐに参加できます。",
      },
    },
    {
      "@type": "Question",
      name: "データは安全に管理されていますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "データは暗号化して保存しています。クレジットカード情報はStripe社が安全に管理します。",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage />
    </>
  );
}

import type { Metadata } from "next";
import { SharedWalletGuide } from "@/components/landing";

const title =
  "カップルの共同財布アプリ、どう選ぶ？ふたりのお金を管理する3つの方法｜Pairbo";
const description =
  "共同口座・共同財布アプリ・各自で払って精算する方法を比較します。お財布を別々にしたまま、ふたりの生活費を公平に分けられる無料の共有家計簿Pairboの使い方も紹介します。";

// openGraph・twitterは親layoutの値とマージされず丸ごと置き換わるため、画像も指定する
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guide/shared-wallet" },
  openGraph: {
    title,
    description,
    url: "/guide/shared-wallet",
    siteName: "Pairbo",
    locale: "ja_JP",
    type: "article",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function SharedWalletGuidePage() {
  return <SharedWalletGuide />;
}

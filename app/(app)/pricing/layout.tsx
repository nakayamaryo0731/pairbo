import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/pricing",
  },
  title: "料金プラン | Pairbo - 同棲カップル向け共有家計簿",
  description:
    "Pairboの料金プラン。同棲の生活費管理に必要な基本機能はすべて無料。Premiumプラン（月額100円）で傾斜折半・詳細分析が利用可能。",
  openGraph: {
    title: "料金プラン | Pairbo - 同棲カップル向け共有家計簿",
    description:
      "基本機能は無料。月額100円のPremiumプランで傾斜折半・詳細分析が利用可能。",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

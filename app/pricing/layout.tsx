import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/pricing",
  },
  title: "料金プラン | Pairbo - 2人のための共有家計簿",
  description:
    "Pairboの料金プラン。基本機能は無料、Premiumプラン（月額300円/年額2,400円）で傾斜折半・詳細分析が利用可能。",
  openGraph: {
    title: "料金プラン | Pairbo",
    description:
      "基本機能は無料。Premiumプランで傾斜折半・詳細分析が利用可能。",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

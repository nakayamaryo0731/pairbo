import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { AdBanner } from "@/components/ads";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { GoogleAdSense } from "@/components/GoogleAdSense";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pairbo.vercel.app"),
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "WlzApyG_0w14M7XXCTaIrsShDFdFqfuK72W_w15m8kY",
  },
  title: "Pairbo - 2人のための共有家計簿",
  description:
    "割り勘・傾斜折半ができる共有家計簿。アプリ不要、URLだけですぐ始められます。",
  openGraph: {
    title: "Pairbo - 2人のための共有家計簿",
    description:
      "割り勘・傾斜折半ができる共有家計簿。アプリ不要、URLだけですぐ始められます。",
    url: "https://pairbo.vercel.app",
    siteName: "Pairbo",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 612,
        height: 408,
        alt: "Pairbo - 2人のための支出管理",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pairbo - 2人のための共有家計簿",
    description:
      "割り勘・傾斜折半ができる共有家計簿。アプリ不要、URLだけですぐ始められます。",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pairbo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <GoogleAdSense />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Pairbo",
              url: "https://pairbo.vercel.app",
              description:
                "割り勘・傾斜折半ができる共有家計簿。アプリ不要、URLだけですぐ始められます。",
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
              browserRequirements: "Requires JavaScript",
              inLanguage: "ja",
              image: "https://pairbo.vercel.app/og-image.png",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "JPY",
                  name: "Free",
                },
                {
                  "@type": "Offer",
                  price: "300",
                  priceCurrency: "JPY",
                  name: "Premium（月払い）",
                },
                {
                  "@type": "Offer",
                  price: "2400",
                  priceCurrency: "JPY",
                  name: "Premium（年払い）",
                },
              ],
              provider: {
                "@type": "Organization",
                name: "Pairbo",
                url: "https://pairbo.vercel.app",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "本当に無料で使えますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "基本機能はすべて無料です。傾斜折半や詳細分析が使えるPremiumプランもあります。",
                  },
                },
                {
                  "@type": "Question",
                  name: "アプリのインストールは必要ですか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "不要です。ブラウザからアクセスするだけで使えます。ホーム画面に追加すればネイティブアプリのように使えます（PWA対応）。",
                  },
                },
                {
                  "@type": "Question",
                  name: "共有口座が必要ですか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "いいえ。お財布は別々のままでOKです。それぞれが支払った支出を記録し、月末に差額を精算する仕組みです。",
                  },
                },
                {
                  "@type": "Question",
                  name: "2人以上でも使えますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "はい。シェアハウスなど複数人のグループにも対応しています。",
                  },
                },
                {
                  "@type": "Question",
                  name: "いつでも解約できますか？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "はい、いつでも解約できます。解約後も期間終了まではPremiumプランをご利用いただけます。",
                  },
                },
                {
                  "@type": "Question",
                  name: "データのセキュリティは？",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "データは暗号化して保存しています。クレジットカード情報はStripe社が安全に管理します。",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <ConvexClientProvider>
          <div className="pb-14">{children}</div>
          <AdBanner />
        </ConvexClientProvider>
      </body>
    </html>
  );
}

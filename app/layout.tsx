import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SerwistProvider } from "@serwist/turbopack/react";
import { PwaInstallPromptProvider } from "@/components/pwa/PwaInstallPromptProvider";
import { IS_STAGING } from "@/lib/appEnv";
import { iconUrl } from "@/lib/appIcons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pairbo.app"),
  verification: {
    google: "WlzApyG_0w14M7XXCTaIrsShDFdFqfuK72W_w15m8kY",
  },
  title:
    "Pairbo - 同棲・二人暮らしの共有家計簿アプリ｜カップル・夫婦の共同財布を無料で",
  description:
    "同棲カップル・夫婦・二人暮らしの生活費分担を簡単に。割り勘・傾斜折半・収入比に応じた負担配分に対応。共同財布がなくてもお財布別のまま使える無料の共有家計簿アプリ。ブラウザで完結、URLを送るだけで今日から始められます。",
  openGraph: {
    title: "Pairbo - 同棲・二人暮らしの共有家計簿アプリ",
    description:
      "カップル・夫婦の生活費分担がブラウザだけで完結。共同財布不要、無料で使える共有家計簿アプリ。",
    url: "https://pairbo.app",
    siteName: "Pairbo",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pairbo - 2人のための支出管理",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pairbo - 同棲・二人暮らしの共有家計簿アプリ",
    description:
      "カップル・夫婦の生活費分担がブラウザだけで完結。共同財布不要、無料で使える共有家計簿アプリ。",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: IS_STAGING ? "Pairbo STG" : "Pairbo",
  },
  formatDetection: {
    telephone: false,
  },
  ...(IS_STAGING && {
    icons: { icon: iconUrl("favicon-32x32.png") },
  }),
};

export const viewport: Viewport = {
  themeColor: IS_STAGING ? "#b05026" : "#3b82f6",
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
        <link rel="apple-touch-icon" href={iconUrl("apple-touch-icon.png")} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Pairbo",
              url: "https://pairbo.app",
              description:
                "同棲カップル・夫婦・二人暮らしの生活費分担を簡単に。割り勘・傾斜折半・収入比に応じた負担配分に対応。共同財布がなくてもお財布別のまま使える無料の共有家計簿アプリ。",
              applicationCategory: "FinanceApplication",
              operatingSystem: "All",
              browserRequirements: "Requires JavaScript",
              inLanguage: "ja",
              image: "https://pairbo.app/og-image.png",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "JPY",
                  name: "Free",
                },
                {
                  "@type": "Offer",
                  price: "100",
                  priceCurrency: "JPY",
                  name: "Premium（月払い）",
                },
                {
                  "@type": "Offer",
                  price: "1000",
                  priceCurrency: "JPY",
                  name: "Premium（年払い）",
                },
              ],
              provider: {
                "@type": "Organization",
                name: "Pairbo",
                url: "https://pairbo.app",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV !== "production"}
          // 認証後ページのHTMLをキャッシュしない・オンライン復帰時の自動リロードで入力中の内容を失わないようにする
          cacheOnNavigation={false}
          reloadOnOnline={false}
        >
          <PwaInstallPromptProvider>
            <div className="pb-14">{children}</div>
          </PwaInstallPromptProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}

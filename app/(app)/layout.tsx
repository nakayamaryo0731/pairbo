import type { Metadata } from "next";
import ConvexClientProvider from "@/components/ConvexClientProvider";

// ログイン後の画面や招待ページを検索結果に出さない（料金ページは個別に上書き）
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * 認証・データアクセスが必要なルート用のレイアウト。
 * Clerk/Convexのプロバイダをここに限定することで、
 * LP等の静的ページに認証系のJSが載らないようにしている。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}

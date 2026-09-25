import ConvexClientProvider from "@/components/ConvexClientProvider";

/**
 * 認証・データアクセスが必要なルート用のレイアウト。
 * Clerk/Convexのプロバイダをここに限定することで、
 * LP等の静的ページに認証系のJSが載らないようにしている。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}

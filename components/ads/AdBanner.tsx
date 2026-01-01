"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ProPromoBanner } from "./ProPromoBanner";

/**
 * 広告バナーコンポーネント
 * - Proユーザー: 表示しない
 * - Freeユーザー/未ログイン: ProPromoBannerを表示
 * - グループ詳細ページ: 表示しない（TabNavigationと競合するため）
 */
export function AdBanner() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // 認証済みの場合のみサブスク状態を取得
  const subscription = useQuery(
    api.subscriptions.getMySubscription,
    isAuthenticated ? {} : "skip",
  );

  // グループ詳細ページではTabNavigationがあるため非表示
  // /groups/[groupId] のメインページのみ対象（settings等は表示）
  const isGroupDetailPage =
    pathname?.match(/^\/groups\/[^/]+$/) !== null ||
    pathname?.match(/^\/groups\/[^/]+\/shopping$/) !== null;

  if (isGroupDetailPage) {
    return null;
  }

  // 認証ローディング中は表示しない（ちらつき防止）
  if (isLoading) {
    return null;
  }

  // Proユーザーは広告非表示
  if (subscription?.plan === "pro") {
    return null;
  }

  // Freeユーザーまたは未ログインユーザーに広告を表示
  return <ProPromoBanner />;
}

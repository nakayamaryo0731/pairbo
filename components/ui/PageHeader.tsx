"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  /** 戻り先のURL */
  backHref: string;
  /** ページタイトル */
  title?: string;
  /** ローディング中かどうか */
  isLoading?: boolean;
  /** 右側に表示する要素 */
  rightElement?: ReactNode;
};

/**
 * 共通ページヘッダーコンポーネント
 * - 左: 戻るボタン
 * - 中央: タイトル
 * - 右: カスタム要素（なければ空のプレースホルダー）
 */
export function PageHeader({
  backHref,
  title,
  isLoading = false,
  rightElement,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 h-14">
        <Link
          href={backHref}
          className="text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        {isLoading ? (
          <div className="h-5 w-20 bg-slate-100 rounded animate-pulse" />
        ) : (
          <h1 className="text-lg font-semibold">{title}</h1>
        )}
        {rightElement ?? <div className="w-6" />}
      </div>
    </header>
  );
}

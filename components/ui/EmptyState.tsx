"use client";

import type { ReactNode } from "react";

type EmptyStateProps = {
  /**
   * 表示する絵文字（例: "📝", "🏠"）
   */
  emoji?: string;
  /**
   * メインメッセージ
   */
  title: string;
  /**
   * サブメッセージ
   */
  description?: string;
  /**
   * アクションボタン等
   */
  action?: ReactNode;
  /**
   * サイズバリアント
   * - compact: 小さめのパディング（py-4）
   * - normal: 通常サイズ（py-8）
   * - large: 大きめのパディング（py-12）
   */
  variant?: "compact" | "normal" | "large";
};

const variantStyles = {
  compact: {
    container: "py-4",
    emoji: "text-2xl mb-1",
    title: "text-sm",
    description: "text-xs mt-1",
  },
  normal: {
    container: "py-8",
    emoji: "text-4xl mb-2",
    title: "text-base",
    description: "text-sm mt-1",
  },
  large: {
    container: "py-12",
    emoji: "text-4xl mb-4",
    title: "text-lg font-medium text-slate-800 mb-2",
    description: "text-base mb-6",
  },
};

export function EmptyState({
  emoji,
  title,
  description,
  action,
  variant = "normal",
}: EmptyStateProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`text-center text-slate-500 ${styles.container}`}>
      {emoji && <div className={styles.emoji}>{emoji}</div>}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

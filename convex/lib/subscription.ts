import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * 無料プランの制限
 * 注: グループ数・メンバー数の制限は同棲カップル向けアプリのため廃止
 * 代わりに広告表示やデータエクスポート等で差別化予定
 */
export const FREE_PLAN_LIMITS = {
  historyMonths: 12,
};

/**
 * サブスクリプションプランを取得
 */
export async function getUserPlan(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<"free" | "pro"> {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!subscription) {
    return "free";
  }

  // active または trialing 状態で、かつ有効期限内ならpro
  if (
    (subscription.status === "active" || subscription.status === "trialing") &&
    subscription.plan === "pro"
  ) {
    return "pro";
  }

  // canceled でも期間終了まではpro
  if (
    subscription.status === "canceled" &&
    subscription.plan === "pro" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > Date.now()
  ) {
    return "pro";
  }

  return "free";
}

/**
 * Proプランかどうかを確認
 */
export async function isPro(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const plan = await getUserPlan(ctx, userId);
  return plan === "pro";
}

// グループ数・メンバー数の制限は廃止（同棲カップル向けアプリのため不要）

/**
 * 詳細分析機能にアクセスできるかどうかを確認
 */
export async function canAccessDetailedAnalytics(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  return isPro(ctx, userId);
}

/**
 * データエクスポート機能にアクセスできるかどうかを確認
 */
export async function canExportData(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  return isPro(ctx, userId);
}

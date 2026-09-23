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
): Promise<"free" | "premium"> {
  const user = await ctx.db.get("users", userId);
  if (user?.planOverride) {
    return user.planOverride;
  }

  if (user?.trialExpiresAt && user.trialExpiresAt > Date.now()) {
    return "premium";
  }

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  if (!subscription) {
    return "free";
  }

  // active または trialing 状態で、かつ有効期限内ならpremium
  if (
    (subscription.status === "active" || subscription.status === "trialing") &&
    subscription.plan === "premium"
  ) {
    return "premium";
  }

  // canceled でも期間終了まではpremium
  if (
    subscription.status === "canceled" &&
    subscription.plan === "premium" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > Date.now()
  ) {
    return "premium";
  }

  return "free";
}

/**
 * プレミアムプランかどうかを確認
 */
export async function isPremium(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const plan = await getUserPlan(ctx, userId);
  return plan === "premium";
}

// グループ数・メンバー数の制限は廃止（同棲カップル向けアプリのため不要）

/**
 * グループ内に1人でもPremiumメンバーがいるかを確認（ペアプラン）
 * 1人分の課金でグループ全員にPremium機能を解放する
 */
export async function isGroupPremium(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<boolean> {
  const members = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) => q.eq("groupId", groupId))
    .collect();

  for (const member of members) {
    if (await isPremium(ctx, member.userId)) {
      return true;
    }
  }
  return false;
}

/**
 * 傾斜折半（割合・金額指定）にアクセスできるかどうかを確認
 */
export async function canUseSlopedSplit(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<boolean> {
  return isGroupPremium(ctx, groupId);
}

/**
 * 年次分析・月別推移グラフにアクセスできるかどうかを確認
 */
export async function canAccessYearlyAnalytics(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<boolean> {
  return isGroupPremium(ctx, groupId);
}

/**
 * データエクスポート機能にアクセスできるかどうかを確認
 */
export async function canExportData(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<boolean> {
  return isGroupPremium(ctx, groupId);
}

/**
 * タグ機能にアクセスできるかどうかを確認
 */
export async function canUseTags(
  ctx: QueryCtx | MutationCtx,
  groupId: Id<"groups">,
): Promise<boolean> {
  return isGroupPremium(ctx, groupId);
}

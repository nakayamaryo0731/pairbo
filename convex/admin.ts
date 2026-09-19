import { ConvexError } from "convex/values";
import { authQuery } from "./lib/auth";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * 管理者権限チェック
 */
function requireAdmin(isAdmin: boolean | undefined) {
  if (isAdmin !== true) {
    throw new ConvexError("管理者権限が必要です");
  }
}

/**
 * 指定期間以降に操作したユニークユーザーIDを集計
 */
function getActiveUserIds(
  expenses: { createdBy: Id<"users">; createdAt: number }[],
  settlements: { createdBy: Id<"users">; createdAt: number }[],
  shoppingItems: {
    addedBy: Id<"users">;
    purchasedBy?: Id<"users">;
    createdAt: number;
  }[],
  since: number,
): Set<string> {
  const active = new Set<string>();
  for (const e of expenses) {
    if (e.createdAt >= since) active.add(e.createdBy);
  }
  for (const s of settlements) {
    if (s.createdAt >= since) active.add(s.createdBy);
  }
  for (const item of shoppingItems) {
    if (item.createdAt >= since) {
      active.add(item.addedBy);
      if (item.purchasedBy) active.add(item.purchasedBy);
    }
  }
  return active;
}

/**
 * ダッシュボードサマリー
 */
export const getSummary = authQuery({
  args: {},
  handler: async (ctx) => {
    requireAdmin(ctx.user.isAdmin);

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const [users, expenses, settlements, shoppingItems, groups, subscriptions] =
      await Promise.all([
        ctx.db.query("users").collect(),
        ctx.db.query("expenses").collect(),
        ctx.db.query("settlements").collect(),
        ctx.db.query("shoppingItems").collect(),
        ctx.db.query("groups").collect(),
        ctx.db.query("subscriptions").collect(),
      ]);

    // planOverrideとsubscriptionの重複を避けてユニークなPremiumユーザー数を算出
    const premiumUserIds = new Set<string>();
    for (const u of users) {
      if (u.planOverride === "premium") premiumUserIds.add(u._id);
    }
    for (const s of subscriptions) {
      if (s.plan === "premium" && s.status === "active")
        premiumUserIds.add(s.userId);
    }

    const trialClaimedCount = users.filter(
      (u) => u.trialExpiresAt != null,
    ).length;

    return {
      totalUsers: users.length,
      dau: getActiveUserIds(expenses, settlements, shoppingItems, oneDayAgo)
        .size,
      wau: getActiveUserIds(expenses, settlements, shoppingItems, oneWeekAgo)
        .size,
      mau: getActiveUserIds(expenses, settlements, shoppingItems, oneMonthAgo)
        .size,
      totalGroups: groups.length,
      totalExpenses: expenses.length,
      premiumCount: premiumUserIds.size,
      trialClaimedCount,
    };
  },
});

/**
 * ユーザー一覧（管理者用）
 */
export const getUsers = authQuery({
  args: {},
  handler: async (ctx) => {
    requireAdmin(ctx.user.isAdmin);

    const [
      users,
      groupMembers,
      expenses,
      settlements,
      shoppingItems,
      subscriptions,
    ] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("groupMembers").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("settlements").collect(),
      ctx.db.query("shoppingItems").collect(),
      ctx.db.query("subscriptions").collect(),
    ]);

    // ユーザーごとの集計をMapで構築
    const groupCountMap = new Map<string, number>();
    for (const gm of groupMembers) {
      groupCountMap.set(gm.userId, (groupCountMap.get(gm.userId) ?? 0) + 1);
    }

    const expenseCountMap = new Map<string, number>();
    const lastActivityMap = new Map<string, number>();

    for (const e of expenses) {
      expenseCountMap.set(
        e.createdBy,
        (expenseCountMap.get(e.createdBy) ?? 0) + 1,
      );
      const prev = lastActivityMap.get(e.createdBy) ?? 0;
      if (e.createdAt > prev) lastActivityMap.set(e.createdBy, e.createdAt);
    }

    for (const s of settlements) {
      const prev = lastActivityMap.get(s.createdBy) ?? 0;
      if (s.createdAt > prev) lastActivityMap.set(s.createdBy, s.createdAt);
    }

    for (const item of shoppingItems) {
      const prev = lastActivityMap.get(item.addedBy) ?? 0;
      if (item.createdAt > prev)
        lastActivityMap.set(item.addedBy, item.createdAt);
      if (item.purchasedBy) {
        const prevP = lastActivityMap.get(item.purchasedBy) ?? 0;
        if (item.createdAt > prevP)
          lastActivityMap.set(item.purchasedBy, item.createdAt);
      }
    }

    const subMap = new Map<string, string>();
    for (const s of subscriptions) {
      if (s.plan === "premium" && s.status === "active") {
        subMap.set(s.userId, "premium");
      }
    }

    return users.map((u) => ({
      _id: u._id,
      displayName: u.displayName,
      createdAt: u.createdAt,
      plan: u.planOverride ?? subMap.get(u._id) ?? "free",
      groupCount: groupCountMap.get(u._id) ?? 0,
      expenseCount: expenseCountMap.get(u._id) ?? 0,
      lastActivity: lastActivityMap.get(u._id) ?? null,
    }));
  },
});

/**
 * グループ一覧（管理者用）
 */
export const getGroups = authQuery({
  args: {},
  handler: async (ctx) => {
    requireAdmin(ctx.user.isAdmin);

    const [groups, groupMembers, expenses] = await Promise.all([
      ctx.db.query("groups").collect(),
      ctx.db.query("groupMembers").collect(),
      ctx.db.query("expenses").collect(),
    ]);

    const memberCountMap = new Map<string, number>();
    for (const gm of groupMembers) {
      memberCountMap.set(gm.groupId, (memberCountMap.get(gm.groupId) ?? 0) + 1);
    }

    const expenseCountMap = new Map<string, number>();
    const totalAmountMap = new Map<string, number>();
    for (const e of expenses) {
      expenseCountMap.set(e.groupId, (expenseCountMap.get(e.groupId) ?? 0) + 1);
      totalAmountMap.set(
        e.groupId,
        (totalAmountMap.get(e.groupId) ?? 0) + e.amount,
      );
    }

    return groups.map((g) => ({
      _id: g._id,
      name: g.name,
      createdAt: g.createdAt,
      memberCount: memberCountMap.get(g._id) ?? 0,
      expenseCount: expenseCountMap.get(g._id) ?? 0,
      totalAmount: totalAmountMap.get(g._id) ?? 0,
    }));
  },
});

/**
 * 期限切れ trial の trialExpiresAt を全ユーザーから削除する。
 * 終了したキャンペーンの claim 履歴を無効化し、次回キャンペーンの
 * 自動表示・再 claim を可能にする。ダッシュボードから手動実行する。
 */
export const clearExpiredTrials = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const users = await ctx.db.query("users").collect();
    let cleared = 0;
    for (const user of users) {
      if (user.trialExpiresAt != null && user.trialExpiresAt <= now) {
        await ctx.db.patch(user._id, {
          trialExpiresAt: undefined,
          updatedAt: now,
        });
        cleared++;
      }
    }
    return { cleared };
  },
});

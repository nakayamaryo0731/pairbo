import { ConvexError, v } from "convex/values";
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

    const [
      users,
      expenses,
      settlements,
      shoppingItems,
      groups,
      subscriptions,
      inquiries,
    ] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("expenses").collect(),
      ctx.db.query("settlements").collect(),
      ctx.db.query("shoppingItems").collect(),
      ctx.db.query("groups").collect(),
      ctx.db.query("subscriptions").collect(),
      ctx.db.query("inquiries").collect(),
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

    const inquiryCount7d = inquiries.filter(
      (i) => i.createdAt >= oneWeekAgo,
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
      inquiryCount7d,
    };
  },
});

/**
 * 問い合わせ一覧（管理者用、新しい順）
 */
export const getInquiries = authQuery({
  args: {},
  handler: async (ctx) => {
    requireAdmin(ctx.user.isAdmin);

    const inquiries = await ctx.db.query("inquiries").collect();
    inquiries.sort((a, b) => b.createdAt - a.createdAt);

    const userNameCache = new Map<string, string>();
    const results = [];
    for (const inquiry of inquiries.slice(0, 50)) {
      let displayName = userNameCache.get(inquiry.userId);
      if (displayName === undefined) {
        const user = await ctx.db.get(inquiry.userId);
        displayName = user?.displayName ?? "（退会済み）";
        userNameCache.set(inquiry.userId, displayName);
      }
      results.push({
        _id: inquiry._id,
        category: inquiry.category,
        body: inquiry.body,
        createdAt: inquiry.createdAt,
        displayName,
      });
    }
    return results;
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
 * 指定時刻以降に既読化された lastSeenReleaseAt をリセットする。
 * リリース告知の自動表示バグ（表示直後に既読化され再マウントで消える）で
 * 既読扱いになったユーザーへ再表示するための復旧用。ダッシュボードから手動実行する。
 */
export const resetReleaseSeenSince = internalMutation({
  args: { since: v.number() },
  handler: async (ctx, { since }) => {
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    let reset = 0;
    for (const user of users) {
      if (user.lastSeenReleaseAt != null && user.lastSeenReleaseAt >= since) {
        await ctx.db.patch(user._id, {
          lastSeenReleaseAt: undefined,
          updatedAt: now,
        });
        reset++;
      }
    }
    return { reset };
  },
});

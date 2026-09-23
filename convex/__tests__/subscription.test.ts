import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import {
  getUserPlan,
  isPremium,
  isGroupPremium,
  canUseSlopedSplit,
  canAccessYearlyAnalytics,
  canUseTags,
} from "../lib/subscription";
import { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../**/*.ts");

type TestCtx = TestConvex<typeof schema>;

async function setupUser(t: TestCtx) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test_clerk_user_1",
      displayName: "テストユーザー",
      avatarUrl: undefined,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function setupSubscription(
  t: TestCtx,
  userId: Awaited<ReturnType<typeof setupUser>>,
  overrides: {
    plan?: "free" | "premium";
    status?: "active" | "canceled" | "past_due" | "trialing";
    currentPeriodEnd?: number;
    cancelAtPeriodEnd?: boolean;
  } = {},
) {
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("subscriptions", {
      userId,
      stripeCustomerId: "cus_test_123",
      stripeSubscriptionId: "sub_test_123",
      plan: overrides.plan ?? "premium",
      status: overrides.status ?? "active",
      currentPeriodStart: now - 30 * 24 * 60 * 60 * 1000,
      currentPeriodEnd:
        overrides.currentPeriodEnd ?? now + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function setupGroupWithMembers(t: TestCtx, userIds: Id<"users">[]) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    const groupId = await ctx.db.insert("groups", {
      name: "テストグループ",
      closingDay: 25,
      createdAt: now,
      updatedAt: now,
    });
    for (const [i, userId] of userIds.entries()) {
      await ctx.db.insert("groupMembers", {
        groupId,
        userId,
        role: i === 0 ? "owner" : "member",
        joinedAt: now,
      });
    }
    return groupId;
  });
}

async function setupSecondUser(t: TestCtx) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      clerkId: "test_clerk_user_2",
      displayName: "パートナー",
      avatarUrl: undefined,
      createdAt: now,
      updatedAt: now,
    });
  });
}

describe("subscription helpers", () => {
  describe("getUserPlan", () => {
    test("サブスクリプションなし → free", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("free");
    });

    test("status: active, plan: premium → premium", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "active",
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("status: trialing, plan: premium → premium", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "trialing",
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("status: canceled, 期間内 → premium（期間終了まで利用可能）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const futureEnd = Date.now() + 7 * 24 * 60 * 60 * 1000;
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "canceled",
        currentPeriodEnd: futureEnd,
        cancelAtPeriodEnd: true,
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("status: canceled, 期間外 → free", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const pastEnd = Date.now() - 1 * 24 * 60 * 60 * 1000;
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "canceled",
        currentPeriodEnd: pastEnd,
        cancelAtPeriodEnd: true,
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("free");
    });

    test("status: past_due → free", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "past_due",
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("free");
    });

    test("planOverride → オーバーライドの値を返す", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "override_user",
          displayName: "オーバーライドユーザー",
          avatarUrl: undefined,
          planOverride: "premium",
          createdAt: now,
          updatedAt: now,
        });
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("planOverride はサブスクリプションより優先される", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "override_user",
          displayName: "オーバーライドユーザー",
          avatarUrl: undefined,
          planOverride: "premium",
          createdAt: now,
          updatedAt: now,
        });
      });
      // freeのサブスクリプションがあっても、オーバーライドが優先
      await setupSubscription(t, userId, {
        plan: "free",
        status: "active",
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("trialExpiresAt 有効期間中 → premium", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "trial_user",
          displayName: "トライアルユーザー",
          avatarUrl: undefined,
          trialExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
          createdAt: now,
          updatedAt: now,
        });
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("trialExpiresAt 期限切れ → free に自動降格", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "expired_trial_user",
          displayName: "期限切れトライアル",
          avatarUrl: undefined,
          trialExpiresAt: now - 1000,
          createdAt: now,
          updatedAt: now,
        });
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("free");
    });

    test("planOverride は trial よりも優先される", async () => {
      const t = convexTest(schema, modules);
      const userId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "override_with_trial",
          displayName: "オーバーライド+trial",
          avatarUrl: undefined,
          planOverride: "free",
          trialExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
          createdAt: now,
          updatedAt: now,
        });
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("free");
    });
  });

  describe("isPremium", () => {
    test("premium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId, {
        plan: "premium",
        status: "active",
      });

      const result = await t.run(async (ctx) => {
        return await isPremium(ctx, userId);
      });

      expect(result).toBe(true);
    });

    test("free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      const result = await t.run(async (ctx) => {
        return await isPremium(ctx, userId);
      });

      expect(result).toBe(false);
    });
  });

  describe("isGroupPremium（ペアプラン）", () => {
    test("メンバー全員free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      const groupId = await setupGroupWithMembers(t, [userId, partnerId]);

      const result = await t.run(async (ctx) => {
        return await isGroupPremium(ctx, groupId);
      });

      expect(result).toBe(false);
    });

    test("1人がpremium → true（相手が課金していなくても）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      const groupId = await setupGroupWithMembers(t, [userId, partnerId]);
      await setupSubscription(t, partnerId);

      const result = await t.run(async (ctx) => {
        return await isGroupPremium(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("trial中のメンバーがいる → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const trialUserId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "group_trial_user",
          displayName: "トライアル中パートナー",
          avatarUrl: undefined,
          trialExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
          createdAt: now,
          updatedAt: now,
        });
      });
      const groupId = await setupGroupWithMembers(t, [userId, trialUserId]);

      const result = await t.run(async (ctx) => {
        return await isGroupPremium(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("planOverride: premium のメンバーがいる → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const overrideUserId = await t.run(async (ctx) => {
        const now = Date.now();
        return await ctx.db.insert("users", {
          clerkId: "group_override_user",
          displayName: "オーバーライドパートナー",
          avatarUrl: undefined,
          planOverride: "premium",
          createdAt: now,
          updatedAt: now,
        });
      });
      const groupId = await setupGroupWithMembers(t, [userId, overrideUserId]);

      const result = await t.run(async (ctx) => {
        return await isGroupPremium(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("premiumメンバーが脱退 → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      const groupId = await setupGroupWithMembers(t, [userId, partnerId]);
      await setupSubscription(t, partnerId);

      await t.run(async (ctx) => {
        const membership = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", groupId).eq("userId", partnerId),
          )
          .unique();
        await ctx.db.delete("groupMembers", membership!._id);
      });

      const result = await t.run(async (ctx) => {
        return await isGroupPremium(ctx, groupId);
      });

      expect(result).toBe(false);
    });
  });

  describe("機能ゲート", () => {
    test("canUseSlopedSplit: グループ内にpremium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canUseSlopedSplit(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("canUseSlopedSplit: 全員free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canUseSlopedSplit(ctx, groupId);
      });

      expect(result).toBe(false);
    });

    test("canAccessYearlyAnalytics: グループ内にpremium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canAccessYearlyAnalytics(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("canAccessYearlyAnalytics: 全員free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canAccessYearlyAnalytics(ctx, groupId);
      });

      expect(result).toBe(false);
    });

    test("canUseTags: グループ内にpremium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canUseTags(ctx, groupId);
      });

      expect(result).toBe(true);
    });

    test("canUseTags: 全員free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const groupId = await setupGroupWithMembers(t, [userId]);

      const result = await t.run(async (ctx) => {
        return await canUseTags(ctx, groupId);
      });

      expect(result).toBe(false);
    });
  });

  describe("getGroupPremium クエリ", () => {
    test("メンバーとして取得できる（パートナーがpremium → isPremium: true）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      const groupId = await setupGroupWithMembers(t, [userId, partnerId]);
      await setupSubscription(t, partnerId);

      const result = await t
        .withIdentity({ subject: "test_clerk_user_1" })
        .query(api.subscriptions.getGroupPremium, { groupId });

      expect(result.isPremium).toBe(true);
    });

    test("グループ外のユーザー → エラー", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSecondUser(t);
      const groupId = await setupGroupWithMembers(t, [userId]);

      await expect(
        t
          .withIdentity({ subject: "test_clerk_user_2" })
          .query(api.subscriptions.getGroupPremium, { groupId }),
      ).rejects.toThrow();
    });
  });

  describe("hasPremiumPartner クエリ", () => {
    test("パートナーがpremium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      await setupGroupWithMembers(t, [userId, partnerId]);
      await setupSubscription(t, partnerId);

      const result = await t
        .withIdentity({ subject: "test_clerk_user_1" })
        .query(api.subscriptions.hasPremiumPartner, {});

      expect(result.hasPremiumPartner).toBe(true);
    });

    test("自分だけがpremium → false（自分は除外）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      await setupGroupWithMembers(t, [userId, partnerId]);
      await setupSubscription(t, userId);

      const result = await t
        .withIdentity({ subject: "test_clerk_user_1" })
        .query(api.subscriptions.hasPremiumPartner, {});

      expect(result.hasPremiumPartner).toBe(false);
    });

    test("全員free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      const partnerId = await setupSecondUser(t);
      await setupGroupWithMembers(t, [userId, partnerId]);

      const result = await t
        .withIdentity({ subject: "test_clerk_user_1" })
        .query(api.subscriptions.hasPremiumPartner, {});

      expect(result.hasPremiumPartner).toBe(false);
    });

    test("未認証 → false", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.subscriptions.hasPremiumPartner, {});

      expect(result.hasPremiumPartner).toBe(false);
    });
  });

  describe("getMySubscription エッジケース", () => {
    test("未認証ユーザー → { plan: 'free' }", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.subscriptions.getMySubscription, {});

      expect(result.plan).toBe("free");
      expect(result.status).toBeNull();
    });

    test("usersテーブルにレコードなし → { plan: 'free' }", async () => {
      const t = convexTest(schema, modules);

      const result = await t
        .withIdentity({
          subject: "nonexistent_clerk_id",
          name: "存在しないユーザー",
          email: "no@example.com",
        })
        .query(api.subscriptions.getMySubscription, {});

      expect(result.plan).toBe("free");
      expect(result.status).toBeNull();
    });
  });
});

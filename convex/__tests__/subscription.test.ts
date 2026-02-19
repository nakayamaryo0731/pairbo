import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import {
  getUserPlan,
  isPremium,
  canUseSlopedSplit,
  canAccessYearlyAnalytics,
  canUseTags,
} from "../lib/subscription";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

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

  describe("機能ゲート", () => {
    test("canUseSlopedSplit: premium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);

      const result = await t.run(async (ctx) => {
        return await canUseSlopedSplit(ctx, userId);
      });

      expect(result).toBe(true);
    });

    test("canUseSlopedSplit: free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      const result = await t.run(async (ctx) => {
        return await canUseSlopedSplit(ctx, userId);
      });

      expect(result).toBe(false);
    });

    test("canAccessYearlyAnalytics: premium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);

      const result = await t.run(async (ctx) => {
        return await canAccessYearlyAnalytics(ctx, userId);
      });

      expect(result).toBe(true);
    });

    test("canAccessYearlyAnalytics: free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      const result = await t.run(async (ctx) => {
        return await canAccessYearlyAnalytics(ctx, userId);
      });

      expect(result).toBe(false);
    });

    test("canUseTags: premium → true", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);
      await setupSubscription(t, userId);

      const result = await t.run(async (ctx) => {
        return await canUseTags(ctx, userId);
      });

      expect(result).toBe(true);
    });

    test("canUseTags: free → false", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      const result = await t.run(async (ctx) => {
        return await canUseTags(ctx, userId);
      });

      expect(result).toBe(false);
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

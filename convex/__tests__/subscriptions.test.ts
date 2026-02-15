import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";

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

const now = Date.now();

function makeSubscriptionArgs(
  userId: Awaited<ReturnType<typeof setupUser>>,
  overrides: Record<string, unknown> = {},
) {
  return {
    userId,
    stripeCustomerId: "cus_test_123",
    stripeSubscriptionId: "sub_test_123",
    plan: "premium" as const,
    status: "active" as const,
    currentPeriodStart: now,
    currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

describe("subscriptions mutations", () => {
  describe("upsertSubscription", () => {
    test("新規作成: subscriptionsテーブルにレコードが作成される", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      const sub = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(sub).not.toBeNull();
      expect(sub?.plan).toBe("premium");
      expect(sub?.status).toBe("active");
      expect(sub?.stripeCustomerId).toBe("cus_test_123");
      expect(sub?.stripeSubscriptionId).toBe("sub_test_123");
    });

    test("既存更新: 既存レコードが更新される", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      // 1回目: 作成
      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      // 2回目: 更新（statusをcanceledに変更）
      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId, {
          stripeSubscriptionId: "sub_test_456",
          status: "canceled" as const,
          cancelAtPeriodEnd: true,
        }),
      );

      const sub = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(sub?.status).toBe("canceled");
      expect(sub?.stripeSubscriptionId).toBe("sub_test_456");
      expect(sub?.cancelAtPeriodEnd).toBe(true);
    });

    test("二重作成防止: 同じuserIdで2回呼んでもレコードは1つ", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );
      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      const subs = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
      });

      expect(subs).toHaveLength(1);
    });
  });

  describe("updateSubscriptionStatus", () => {
    test("ステータス更新", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      const newPeriodEnd = now + 60 * 24 * 60 * 60 * 1000;

      await t.mutation(internal.subscriptions.updateSubscriptionStatus, {
        stripeSubscriptionId: "sub_test_123",
        status: "canceled",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: newPeriodEnd,
      });

      const sub = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(sub?.status).toBe("canceled");
      expect(sub?.cancelAtPeriodEnd).toBe(true);
      expect(sub?.currentPeriodEnd).toBe(newPeriodEnd);
    });

    test("存在しないsubscriptionId: エラーにならない", async () => {
      const t = convexTest(schema, modules);

      // エラーが投げられないことを確認
      await expect(
        t.mutation(internal.subscriptions.updateSubscriptionStatus, {
          stripeSubscriptionId: "sub_nonexistent",
          status: "canceled",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("deleteSubscription", () => {
    test("削除: plan → free, status → canceled に変更（論理削除）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      await t.mutation(internal.subscriptions.deleteSubscription, {
        stripeSubscriptionId: "sub_test_123",
      });

      const sub = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(sub).not.toBeNull();
      expect(sub?.plan).toBe("free");
      expect(sub?.status).toBe("canceled");
      expect(sub?.stripeSubscriptionId).toBeUndefined();
      expect(sub?.cancelAtPeriodEnd).toBe(false);
    });

    test("存在しないsubscriptionId: エラーにならない", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(internal.subscriptions.deleteSubscription, {
          stripeSubscriptionId: "sub_nonexistent",
        }),
      ).resolves.not.toThrow();
    });
  });
});

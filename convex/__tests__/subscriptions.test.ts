import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import { getUserPlan } from "../lib/subscription";

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

  describe("Stripe webhook idempotency", () => {
    test("isEventProcessed: 未記録なら false", async () => {
      const t = convexTest(schema, modules);
      const result = await t.query(internal.subscriptions.isEventProcessed, {
        eventId: "evt_test_unseen",
      });
      expect(result).toBe(false);
    });

    test("markEventProcessed → isEventProcessed: true を返す", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(internal.subscriptions.markEventProcessed, {
        eventId: "evt_test_1",
        eventType: "checkout.session.completed",
      });
      const result = await t.query(internal.subscriptions.isEventProcessed, {
        eventId: "evt_test_1",
      });
      expect(result).toBe(true);
    });

    test("markEventProcessed: 同じ event.id を二度マークしても重複しない", async () => {
      const t = convexTest(schema, modules);
      await t.mutation(internal.subscriptions.markEventProcessed, {
        eventId: "evt_test_dup",
        eventType: "customer.subscription.updated",
      });
      await t.mutation(internal.subscriptions.markEventProcessed, {
        eventId: "evt_test_dup",
        eventType: "customer.subscription.updated",
      });
      const records = await t.run(async (ctx) => {
        return await ctx.db
          .query("processedStripeEvents")
          .withIndex("by_event_id", (q) => q.eq("eventId", "evt_test_dup"))
          .collect();
      });
      expect(records).toHaveLength(1);
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

  describe("ステータス遷移", () => {
    test("past_due → active 復帰: getUserPlanがpremiumを返す", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId, { status: "past_due" as const }),
      );

      // past_due → active に復帰
      await t.mutation(internal.subscriptions.updateSubscriptionStatus, {
        stripeSubscriptionId: "sub_test_123",
        status: "active",
        currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
      });

      const plan = await t.run(async (ctx) => {
        return await getUserPlan(ctx, userId);
      });

      expect(plan).toBe("premium");
    });

    test("active → canceled → deleted: ライフサイクル全体", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      // active で作成
      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId),
      );

      // canceled に変更
      await t.mutation(internal.subscriptions.updateSubscriptionStatus, {
        stripeSubscriptionId: "sub_test_123",
        status: "canceled",
        cancelAtPeriodEnd: true,
      });

      const subAfterCancel = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });
      expect(subAfterCancel?.status).toBe("canceled");
      expect(subAfterCancel?.cancelAtPeriodEnd).toBe(true);

      // deleted（論理削除）
      await t.mutation(internal.subscriptions.deleteSubscription, {
        stripeSubscriptionId: "sub_test_123",
      });

      const subAfterDelete = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });
      expect(subAfterDelete?.plan).toBe("free");
      expect(subAfterDelete?.status).toBe("canceled");
      expect(subAfterDelete?.stripeSubscriptionId).toBeUndefined();
    });
  });

  describe("upsertSubscription 追加ケース", () => {
    test("stripeCustomerIdはupsert時に更新されない（初回作成時のみ設定）", async () => {
      const t = convexTest(schema, modules);
      const userId = await setupUser(t);

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId, { stripeCustomerId: "cus_old_123" }),
      );

      await t.mutation(
        internal.subscriptions.upsertSubscription,
        makeSubscriptionArgs(userId, { stripeCustomerId: "cus_new_456" }),
      );

      const sub = await t.run(async (ctx) => {
        return await ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .unique();
      });

      expect(sub?.stripeCustomerId).toBe("cus_old_123");
    });
  });
});

describe("claimTrial", () => {
  const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;
  const claimIdentity = {
    subject: "test_claim_user",
    name: "クレームテスト",
    email: "claim@example.com",
  };

  test("trial 未取得 / 非 Premium ユーザーは付与される", async () => {
    const { api } = await import("../_generated/api");
    const t = convexTest(schema, modules);
    // 先に ensureUser でユーザーを作成
    await t.withIdentity(claimIdentity).mutation(api.users.ensureUser, {});

    const before = Date.now();
    const result = await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});
    const after = Date.now();

    expect(result.granted).toBe(true);
    if (result.granted) {
      expect(result.expiresAt).toBeGreaterThanOrEqual(before + TRIAL_MS);
      expect(result.expiresAt).toBeLessThanOrEqual(after + TRIAL_MS);
    }

    const user = await t.run(async (ctx) => {
      return await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", claimIdentity.subject))
        .unique();
    });
    expect(user?.trialExpiresAt).toBeDefined();
  });

  test("既に trial 取得済みなら no-op", async () => {
    const { api } = await import("../_generated/api");
    const t = convexTest(schema, modules);
    await t.withIdentity(claimIdentity).mutation(api.users.ensureUser, {});

    await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});
    const second = await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});

    expect(second.granted).toBe(false);
    if (!second.granted) {
      expect(second.reason).toBe("already_claimed");
    }
  });

  test("active Stripe Premium 課金者は no-op", async () => {
    const { api } = await import("../_generated/api");
    const t = convexTest(schema, modules);
    await t.withIdentity(claimIdentity).mutation(api.users.ensureUser, {});

    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", claimIdentity.subject))
        .unique();
      if (!user) throw new Error("user not found");
      const nowTs = Date.now();
      await ctx.db.insert("subscriptions", {
        userId: user._id,
        stripeCustomerId: "cus_paying",
        stripeSubscriptionId: "sub_paying",
        plan: "premium",
        status: "active",
        currentPeriodStart: nowTs,
        currentPeriodEnd: nowTs + 30 * 24 * 60 * 60 * 1000,
        cancelAtPeriodEnd: false,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
    });

    const result = await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});

    expect(result.granted).toBe(false);
    if (!result.granted) {
      expect(result.reason).toBe("already_paying");
    }
  });

  test("admin planOverride premium は no-op", async () => {
    const { api } = await import("../_generated/api");
    const t = convexTest(schema, modules);
    await t.withIdentity(claimIdentity).mutation(api.users.ensureUser, {});
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", claimIdentity.subject))
        .unique();
      if (!user) throw new Error("user not found");
      await ctx.db.patch("users", user._id, { planOverride: "premium" });
    });

    const result = await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});

    expect(result.granted).toBe(false);
    if (!result.granted) {
      expect(result.reason).toBe("admin_override");
    }
  });

  test("getUserPlan が claim 後 premium を返す", async () => {
    const { api } = await import("../_generated/api");
    const t = convexTest(schema, modules);
    await t.withIdentity(claimIdentity).mutation(api.users.ensureUser, {});
    await t
      .withIdentity(claimIdentity)
      .mutation(api.subscriptions.claimTrial, {});

    const plan = await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", claimIdentity.subject))
        .unique();
      if (!user) throw new Error("user not found");
      return await getUserPlan(ctx, user._id);
    });
    expect(plan).toBe("premium");
  });
});

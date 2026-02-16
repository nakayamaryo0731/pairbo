import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { authMutation } from "./lib/auth";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// ========================================
// Stripe初期化
// ========================================

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(apiKey);
}

// ========================================
// 公開クエリ
// ========================================

/**
 * 現在のサブスクリプション状態を取得
 */
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        plan: "free" as const,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return {
        plan: "free" as const,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    if (user.isAdmin === true && user.planOverride) {
      return {
        plan: user.planOverride,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!subscription) {
      return {
        plan: "free" as const,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  },
});

// ========================================
// Stripeアクション
// ========================================

/**
 * Checkoutセッションを作成
 */
export const createCheckoutSession = action({
  args: {
    priceType: v.union(v.literal("monthly"), v.literal("yearly")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    // ユーザー情報を取得
    const user = await ctx.runQuery(internal.subscriptions.getCurrentUser);
    if (!user) {
      throw new Error("認証が必要です");
    }

    const stripe = getStripe();

    // 既存のStripe顧客を取得または作成
    let stripeCustomerId: string;
    const existingSubscription = await ctx.runQuery(
      internal.subscriptions.getSubscriptionByUserId,
      { userId: user._id },
    );

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
    } else {
      // 新規顧客作成
      const customer = await stripe.customers.create({
        metadata: {
          userId: user._id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Price IDを取得
    const priceId =
      args.priceType === "monthly"
        ? process.env.STRIPE_PRICE_MONTHLY
        : process.env.STRIPE_PRICE_YEARLY;

    if (!priceId) {
      throw new Error("Price ID is not configured");
    }

    // Checkoutセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        userId: user._id,
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    return { url: session.url };
  },
});

/**
 * Customer Portalセッションを作成（プラン管理用）
 */
export const createPortalSession = action({
  args: {
    returnUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const user = await ctx.runQuery(internal.subscriptions.getCurrentUser);
    if (!user) {
      throw new Error("認証が必要です");
    }

    const subscription = await ctx.runQuery(
      internal.subscriptions.getSubscriptionByUserId,
      { userId: user._id },
    );

    if (!subscription?.stripeCustomerId) {
      throw new Error("サブスクリプションが見つかりません");
    }

    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: args.returnUrl,
    });

    return { url: session.url };
  },
});

// ========================================
// 内部クエリ（Webhook用）
// ========================================

export const getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getSubscriptionByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getSubscriptionByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .unique();
  },
});

// ========================================
// 内部ミューテーション（Webhook用）
// ========================================

export const upsertSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    plan: v.union(v.literal("free"), v.literal("premium")),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.plan,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        userId: args.userId,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        plan: args.plan,
        status: args.status,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const updateSubscriptionStatus = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("trialing"),
    ),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
      )
      .unique();

    if (!subscription) {
      console.error(
        "Subscription not found for ID:",
        args.stripeSubscriptionId,
      );
      return;
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.cancelAtPeriodEnd !== undefined) {
      updates.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
    }

    if (args.currentPeriodEnd !== undefined) {
      updates.currentPeriodEnd = args.currentPeriodEnd;
    }

    await ctx.db.patch(subscription._id, updates);
  },
});

export const deleteSubscription = internalMutation({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
      )
      .unique();

    if (subscription) {
      // 削除ではなくfreeプランに戻す
      await ctx.db.patch(subscription._id, {
        plan: "free",
        status: "canceled",
        stripeSubscriptionId: undefined,
        currentPeriodStart: undefined,
        currentPeriodEnd: undefined,
        cancelAtPeriodEnd: false,
        updatedAt: Date.now(),
      });
    }
  },
});

// ========================================
// 開発者用ユーティリティ
// ========================================

/**
 * 開発者をPremiumに設定（CLI用）
 *
 * 使用方法:
 * 1. npx convex run subscriptions:listUsers --prod
 * 2. npx convex run subscriptions:setDeveloperPremium '{"userId":"<user_id>"}' --prod
 */
export const listUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      displayName: u.displayName,
    }));
  },
});

/**
 * 管理者プラン切替（フロントエンドから呼び出し）
 * isAdmin=true のユーザーのみ実行可能
 */
export const setAdminPlanOverride = authMutation({
  args: {
    plan: v.union(v.literal("free"), v.literal("premium")),
  },
  handler: async (ctx, args) => {
    if (!ctx.user.isAdmin) {
      throw new Error("管理者権限が必要です");
    }
    await ctx.db.patch(ctx.user._id, {
      planOverride: args.plan,
      updatedAt: Date.now(),
    });
    ctx.logger.audit("SUBSCRIPTION", "admin_plan_override", {
      plan: args.plan,
    });
  },
});

/**
 * 管理者フラグを設定（CLI用）
 *
 * 使用方法:
 * npx convex run subscriptions:setAdminFlag '{"userId":"<user_id>", "isAdmin": true}' --prod
 */
export const setAdminFlag = internalMutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("ユーザーが見つかりません");
    }
    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
      updatedAt: Date.now(),
    });
    return {
      success: true,
      userId: args.userId,
      displayName: user.displayName,
      isAdmin: args.isAdmin,
    };
  },
});

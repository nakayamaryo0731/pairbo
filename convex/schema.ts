import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  splitMethodValidator,
  memberRoleValidator,
  settlementStatusValidator,
  subscriptionPlanValidator,
  subscriptionStatusValidator,
} from "./lib/validators";

export default defineSchema({
  // ========================================
  // ユーザー
  // ========================================
  users: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    defaultGroupId: v.optional(v.id("groups")),
    isAdmin: v.optional(v.boolean()),
    planOverride: v.optional(v.union(v.literal("free"), v.literal("premium"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
  // 用途: Clerk認証後のユーザー取得

  // ========================================
  // グループ
  // ========================================
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    closingDay: v.number(), // 1-28
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  // インデックス不要: IDで直接取得、一覧はgroupMembersから

  // ========================================
  // グループメンバー
  // ========================================
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    role: memberRoleValidator,
    color: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    // 用途: ユーザーの所属グループ一覧取得
    .index("by_group_and_user", ["groupId", "userId"]),
  // 用途: 権限チェック、グループメンバー一覧（groupIdのみでも使用可）

  // ========================================
  // グループ招待
  // ========================================
  groupInvitations: defineTable({
    groupId: v.id("groups"),
    token: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  }).index("by_token", ["token"]),
  // 用途: トークンから招待情報取得

  // ========================================
  // カテゴリ
  // ========================================
  categories: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.string(),
    isPreset: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  }).index("by_group", ["groupId"]),
  // 用途: グループのカテゴリ一覧

  // ========================================
  // 支出
  // ========================================
  expenses: defineTable({
    groupId: v.id("groups"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    title: v.optional(v.string()), // 支出のタイトル（任意）
    memo: v.optional(v.string()),
    splitMethod: splitMethodValidator,
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_group_and_date", ["groupId", "date"]),
  // 用途: グループの支出一覧（日付範囲検索、グループのみでも使用可）

  // ========================================
  // 支出分割
  // ========================================
  expenseSplits: defineTable({
    expenseId: v.id("expenses"),
    userId: v.id("users"),
    amount: v.number(),
  }).index("by_expense", ["expenseId"]),
  // 用途: 支出の負担配分取得

  // ========================================
  // 精算
  // ========================================
  settlements: defineTable({
    groupId: v.id("groups"),
    periodStart: v.string(), // YYYY-MM-DD
    periodEnd: v.string(), // YYYY-MM-DD
    status: settlementStatusValidator,
    settledAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_group_and_period", ["groupId", "periodStart"]),
  // 用途: グループの精算履歴、期間重複チェック

  // ========================================
  // 精算支払い
  // ========================================
  settlementPayments: defineTable({
    settlementId: v.id("settlements"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    amount: v.number(),
    isPaid: v.boolean(),
    paidAt: v.optional(v.number()),
  }).index("by_settlement", ["settlementId"]),
  // 用途: 精算の支払い詳細取得

  // ========================================
  // 買い物リスト
  // ========================================
  shoppingItems: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    addedBy: v.id("users"),
    purchasedAt: v.optional(v.number()),
    purchasedBy: v.optional(v.id("users")),
    linkedExpenseId: v.optional(v.id("expenses")),
    createdAt: v.number(),
  }).index("by_group_and_purchased", ["groupId", "purchasedAt"]),
  // 用途: グループの買い物リスト（未購入: purchasedAt=null、履歴: purchasedAt!=null）

  // ========================================
  // タグ
  // ========================================
  tags: defineTable({
    groupId: v.id("groups"),
    name: v.string(),
    color: v.string(), // Tailwind色名: "red", "blue", "green", etc.
    sortOrder: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_last_used", ["groupId", "lastUsedAt"]),
  // 用途: グループのタグ一覧、最近使用順での取得

  // ========================================
  // 支出タグ（中間テーブル）
  // ========================================
  expenseTags: defineTable({
    expenseId: v.id("expenses"),
    tagId: v.id("tags"),
  })
    .index("by_expense", ["expenseId"])
    .index("by_tag", ["tagId"]),
  // 用途: 支出のタグ取得、タグの使用状況確認

  // ========================================
  // サブスクリプション
  // ========================================
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: subscriptionPlanValidator,
    status: subscriptionStatusValidator,
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
  // 用途: ユーザーのサブスク状態取得、Stripe Webhook処理
});

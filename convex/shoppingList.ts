import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";
import { getOrThrow } from "./lib/dataHelpers";
import {
  validateShoppingItemName,
  ShoppingItemValidationError,
} from "./domain/shopping";
import { Id } from "./_generated/dataModel";

/**
 * 買い物リスト取得（未購入のみ）
 */
export const list = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // 全アイテムを取得
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 未購入アイテムのみ（createdAt降順）
    const pending = allItems
      .filter((item) => item.purchasedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);

    return pending;
  },
});

/**
 * 購入履歴取得（月別）
 */
export const listPurchasedByMonth = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // 月の開始・終了タイムスタンプを計算
    const startOfMonth = new Date(args.year, args.month - 1, 1).getTime();
    const endOfMonth = new Date(
      args.year,
      args.month,
      0,
      23,
      59,
      59,
      999,
    ).getTime();

    // 全アイテムを取得
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 指定月の購入済みアイテム（purchasedAt降順）
    const purchased = allItems
      .filter(
        (item) =>
          item.purchasedAt !== undefined &&
          item.purchasedAt >= startOfMonth &&
          item.purchasedAt <= endOfMonth,
      )
      .sort((a, b) => (b.purchasedAt ?? 0) - (a.purchasedAt ?? 0));

    // ユーザー情報を取得
    const userIds = new Set<string>();
    purchased.forEach((item) => {
      if (item.purchasedBy) {
        userIds.add(item.purchasedBy);
      }
    });

    const users = await Promise.all(
      Array.from(userIds).map((id) => ctx.db.get(id as Id<"users">)),
    );
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    return purchased.map((item) => ({
      ...item,
      purchasedByUser: item.purchasedBy
        ? userMap.get(item.purchasedBy)
        : undefined,
    }));
  },
});

/**
 * 未購入アイテムのみ取得（支出登録画面用）
 */
export const listPending = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // 未購入アイテムのみ取得（purchasedAt = undefined）
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 未購入のみフィルタリングして createdAt 降順でソート
    return allItems
      .filter((item) => item.purchasedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * アイテム追加
 */
export const add = authMutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    let validatedName: string;
    try {
      validatedName = validateShoppingItemName(args.name);
    } catch (error) {
      if (error instanceof ShoppingItemValidationError) {
        ctx.logger.warn("SHOPPING", "add_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    const itemId = await ctx.db.insert("shoppingItems", {
      groupId: args.groupId,
      name: validatedName,
      addedBy: ctx.user._id,
      createdAt: Date.now(),
    });

    ctx.logger.info("SHOPPING", "item_added", {
      itemId,
      groupId: args.groupId,
      name: validatedName,
    });

    return itemId;
  },
});

/**
 * アイテム削除（未購入のみ）
 */
export const remove = authMutation({
  args: {
    itemId: v.id("shoppingItems"),
  },
  handler: async (ctx, args) => {
    const item = await getOrThrow(ctx, args.itemId, "アイテムが見つかりません");

    // 認可チェック
    await requireGroupMember(ctx, item.groupId);

    if (item.purchasedAt !== undefined) {
      throw new Error("購入済みのアイテムは削除できません");
    }

    await ctx.db.delete(args.itemId);

    ctx.logger.info("SHOPPING", "item_removed", {
      itemId: args.itemId,
      groupId: item.groupId,
      name: item.name,
    });
  },
});

/**
 * 購入済みにする（支出連携なし、買い物リスト画面から）
 */
export const markPurchased = authMutation({
  args: {
    itemId: v.id("shoppingItems"),
  },
  handler: async (ctx, args) => {
    const item = await getOrThrow(ctx, args.itemId, "アイテムが見つかりません");

    // 認可チェック
    await requireGroupMember(ctx, item.groupId);

    if (item.purchasedAt !== undefined) {
      throw new Error("既に購入済みです");
    }

    await ctx.db.patch(args.itemId, {
      purchasedAt: Date.now(),
      purchasedBy: ctx.user._id,
    });

    ctx.logger.info("SHOPPING", "item_marked_purchased", {
      itemId: args.itemId,
      groupId: item.groupId,
      name: item.name,
    });
  },
});

/**
 * 購入解除（支出未連携時のみ）
 */
export const unmarkPurchased = authMutation({
  args: {
    itemId: v.id("shoppingItems"),
  },
  handler: async (ctx, args) => {
    const item = await getOrThrow(ctx, args.itemId, "アイテムが見つかりません");

    // 認可チェック
    await requireGroupMember(ctx, item.groupId);

    if (item.purchasedAt === undefined) {
      throw new Error("このアイテムは未購入です");
    }

    if (item.linkedExpenseId !== undefined) {
      throw new Error("支出と連携済みのため購入解除できません");
    }

    await ctx.db.patch(args.itemId, {
      purchasedAt: undefined,
      purchasedBy: undefined,
    });

    ctx.logger.info("SHOPPING", "item_unmarked_purchased", {
      itemId: args.itemId,
      groupId: item.groupId,
      name: item.name,
    });
  },
});

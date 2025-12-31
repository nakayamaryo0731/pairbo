import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import {
  validateShoppingItemName,
  getHistoryStartTime,
  ShoppingItemValidationError,
} from "./domain/shopping";
import { Id } from "./_generated/dataModel";

/**
 * 買い物リスト取得（未購入 + 直近の購入済み）
 */
export const list = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 全アイテムを取得
    const allItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", args.groupId))
      .collect();

    // ユーザー情報を取得
    const userIds = new Set<string>();
    allItems.forEach((item) => {
      userIds.add(item.addedBy);
      if (item.purchasedBy) {
        userIds.add(item.purchasedBy);
      }
    });

    const users = await Promise.all(
      Array.from(userIds).map((id) => ctx.db.get(id as Id<"users">)),
    );
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    // 未購入アイテム（createdAt降順）
    const pending = allItems
      .filter((item) => item.purchasedAt === undefined)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((item) => ({
        ...item,
        addedByUser: userMap.get(item.addedBy),
      }));

    // 購入済みアイテム（直近30日、purchasedAt降順）
    const historyStartTime = getHistoryStartTime();
    const purchased = allItems
      .filter(
        (item) =>
          item.purchasedAt !== undefined &&
          item.purchasedAt >= historyStartTime,
      )
      .sort((a, b) => (b.purchasedAt ?? 0) - (a.purchasedAt ?? 0))
      .map((item) => ({
        ...item,
        addedByUser: userMap.get(item.addedBy),
        purchasedByUser: item.purchasedBy
          ? userMap.get(item.purchasedBy)
          : undefined,
      }));

    return { pending, purchased };
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
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

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
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

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
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("アイテムが見つかりません");
    }

    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", item.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

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
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("アイテムが見つかりません");
    }

    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", item.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

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
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("アイテムが見つかりません");
    }

    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", item.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

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

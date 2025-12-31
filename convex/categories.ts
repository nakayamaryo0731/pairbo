import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";
import { getOrThrow } from "./lib/dataHelpers";
import {
  validateCategoryName,
  validateCategoryIcon,
  CategoryValidationError,
} from "./domain/category";

/**
 * カテゴリ作成
 */
export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    let validatedName: string;
    let validatedIcon: string;
    try {
      validatedName = validateCategoryName(args.name);
      validatedIcon = validateCategoryIcon(args.icon);
    } catch (error) {
      if (error instanceof CategoryValidationError) {
        ctx.logger.warn("CATEGORY", "create_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const duplicate = existingCategories.find(
      (c) => c.name.trim().toLowerCase() === validatedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error("同じ名前のカテゴリが既に存在します");
    }

    const maxSortOrder = existingCategories.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      0,
    );

    const categoryId = await ctx.db.insert("categories", {
      groupId: args.groupId,
      name: validatedName,
      icon: validatedIcon,
      isPreset: false,
      sortOrder: maxSortOrder + 1,
      createdAt: Date.now(),
    });

    ctx.logger.audit("CATEGORY", "created", {
      categoryId,
      groupId: args.groupId,
      name: validatedName,
    });

    return categoryId;
  },
});

/**
 * カテゴリ更新
 */
export const update = authMutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await getOrThrow(
      ctx,
      args.categoryId,
      "カテゴリが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, category.groupId);

    if (category.isPreset) {
      throw new Error("プリセットカテゴリは編集できません");
    }

    let validatedName: string;
    let validatedIcon: string;
    try {
      validatedName = validateCategoryName(args.name);
      validatedIcon = validateCategoryIcon(args.icon);
    } catch (error) {
      if (error instanceof CategoryValidationError) {
        ctx.logger.warn("CATEGORY", "update_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    const existingCategories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", category.groupId))
      .collect();

    const duplicate = existingCategories.find(
      (c) =>
        c._id !== args.categoryId &&
        c.name.trim().toLowerCase() === validatedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error("同じ名前のカテゴリが既に存在します");
    }

    await ctx.db.patch(args.categoryId, {
      name: validatedName,
      icon: validatedIcon,
    });

    ctx.logger.audit("CATEGORY", "updated", {
      categoryId: args.categoryId,
      groupId: category.groupId,
      name: validatedName,
    });
  },
});

/**
 * カテゴリ削除
 */
export const remove = authMutation({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const category = await getOrThrow(
      ctx,
      args.categoryId,
      "カテゴリが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, category.groupId);

    if (category.isPreset) {
      throw new Error("プリセットカテゴリは削除できません");
    }

    const usedExpense = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", category.groupId))
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .first();

    if (usedExpense) {
      throw new Error(
        "このカテゴリは使用中のため削除できません。先に支出のカテゴリを変更してください。",
      );
    }

    await ctx.db.delete(args.categoryId);

    ctx.logger.audit("CATEGORY", "deleted", {
      categoryId: args.categoryId,
      groupId: category.groupId,
      name: category.name,
    });
  },
});

/**
 * カテゴリ削除可否チェック
 */
export const canDelete = authQuery({
  args: {
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const category = await getOrThrow(
      ctx,
      args.categoryId,
      "カテゴリが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, category.groupId);

    if (category.isPreset) {
      return { canDelete: false, reason: "preset", usageCount: 0 };
    }

    const usedExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", category.groupId))
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .collect();

    if (usedExpenses.length > 0) {
      return {
        canDelete: false,
        reason: "in_use",
        usageCount: usedExpenses.length,
      };
    }

    return { canDelete: true, reason: null, usageCount: 0 };
  },
});

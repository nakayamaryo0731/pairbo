import { v, ConvexError } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";
import { getOrThrow } from "./lib/dataHelpers";
import { canUseTags } from "./lib/subscription";
import {
  TAG_LIMITS,
  validateTagName,
  normalizeTagName,
  TagValidationError,
  isValidTagColor,
  getRandomTagColor,
} from "./domain/tag";

/**
 * タグ一覧取得
 * lastUsedAt降順で最近使用タグを上位に表示
 */
export const list = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return tags.sort((a, b) => {
      const aOrder = a.sortOrder ?? Infinity;
      const bOrder = b.sortOrder ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.createdAt - b.createdAt;
    });
  },
});

/**
 * タグ作成
 */
export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, ctx.user._id);
    if (!canUse) {
      throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
    }

    let normalizedName: string;
    try {
      normalizedName = validateTagName(args.name);
    } catch (error) {
      if (error instanceof TagValidationError) {
        throw new ConvexError(error.message);
      }
      throw error;
    }

    // 色のバリデーション（指定されていればチェック、なければランダム）
    let color: string;
    if (args.color) {
      if (!isValidTagColor(args.color)) {
        throw new ConvexError("無効な色が指定されました");
      }
      color = args.color;
    } else {
      color = getRandomTagColor();
    }

    // 重複チェック
    const existingTags = await ctx.db
      .query("tags")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const duplicate = existingTags.find(
      (t) => t.name.toLowerCase() === normalizedName.toLowerCase(),
    );
    if (duplicate) {
      throw new ConvexError("同じ名前のタグが既に存在します");
    }

    // 上限チェック
    if (existingTags.length >= TAG_LIMITS.MAX_TAGS_PER_GROUP) {
      throw new ConvexError(
        `タグは${TAG_LIMITS.MAX_TAGS_PER_GROUP}個まで作成できます`,
      );
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("tags", {
      groupId: args.groupId,
      name: normalizedName,
      color,
      sortOrder: existingTags.length,
      createdAt: now,
      updatedAt: now,
    });

    ctx.logger.audit("TAG", "created", {
      tagId,
      groupId: args.groupId,
      name: normalizedName,
      color,
    });

    return tagId;
  },
});

/**
 * タグ更新
 */
export const update = authMutation({
  args: {
    tagId: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tag = await getOrThrow(ctx, args.tagId, "タグが見つかりません");
    await requireGroupMember(ctx, tag.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, ctx.user._id);
    if (!canUse) {
      throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
    }

    const updates: Partial<{ name: string; color: string; updatedAt: number }> =
      {
        updatedAt: Date.now(),
      };

    if (args.name !== undefined) {
      let normalizedName: string;
      try {
        normalizedName = validateTagName(args.name);
      } catch (error) {
        if (error instanceof TagValidationError) {
          throw new ConvexError(error.message);
        }
        throw error;
      }

      // 重複チェック（自分以外）
      const existingTags = await ctx.db
        .query("tags")
        .withIndex("by_group", (q) => q.eq("groupId", tag.groupId))
        .collect();

      const duplicate = existingTags.find(
        (t) =>
          t._id !== args.tagId &&
          t.name.toLowerCase() === normalizedName.toLowerCase(),
      );
      if (duplicate) {
        throw new ConvexError("同じ名前のタグが既に存在します");
      }

      updates.name = normalizedName;
    }

    if (args.color !== undefined) {
      if (!isValidTagColor(args.color)) {
        throw new ConvexError("無効な色が指定されました");
      }
      updates.color = args.color;
    }

    await ctx.db.patch(args.tagId, updates);

    ctx.logger.audit("TAG", "updated", {
      tagId: args.tagId,
      groupId: tag.groupId,
      updates: { name: updates.name, color: updates.color },
    });
  },
});

/**
 * タグ削除
 * 関連するexpenseTagsも一括削除
 */
export const remove = authMutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await getOrThrow(ctx, args.tagId, "タグが見つかりません");
    await requireGroupMember(ctx, tag.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, ctx.user._id);
    if (!canUse) {
      throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
    }

    // 関連するexpenseTagsを取得して削除
    const expenseTags = await ctx.db
      .query("expenseTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    for (const expenseTag of expenseTags) {
      await ctx.db.delete(expenseTag._id);
    }

    await ctx.db.delete(args.tagId);

    ctx.logger.audit("TAG", "deleted", {
      tagId: args.tagId,
      groupId: tag.groupId,
      name: tag.name,
      deletedExpenseTagsCount: expenseTags.length,
    });

    return { deletedExpenseTagsCount: expenseTags.length };
  },
});

/**
 * タグ使用状況の取得（削除確認ダイアログ用）
 */
export const getUsageCount = authQuery({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const tag = await getOrThrow(ctx, args.tagId, "タグが見つかりません");
    await requireGroupMember(ctx, tag.groupId);

    const expenseTags = await ctx.db
      .query("expenseTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    return { usageCount: expenseTags.length };
  },
});

/**
 * タグ検索（名前の部分一致）
 */
export const search = authQuery({
  args: {
    groupId: v.id("groups"),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return tags
      .filter((t) => t.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        // 完全一致を優先
        const aExact = a.name.toLowerCase() === normalizedQuery;
        const bExact = b.name.toLowerCase() === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 次にlastUsedAt降順
        const aTime = a.lastUsedAt ?? 0;
        const bTime = b.lastUsedAt ?? 0;
        return bTime - aTime;
      });
  },
});

/**
 * 完全一致するタグが存在するかチェック
 */
export const existsExact = authQuery({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    const normalizedName = normalizeTagName(args.name).toLowerCase();
    if (!normalizedName) {
      return { exists: false, tag: null };
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const exactMatch = tags.find(
      (t) => t.name.toLowerCase() === normalizedName,
    );

    return {
      exists: !!exactMatch,
      tag: exactMatch ?? null,
    };
  },
});

/**
 * タグ並び替え
 */
export const reorder = authMutation({
  args: {
    groupId: v.id("groups"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    const canUse = await canUseTags(ctx, ctx.user._id);
    if (!canUse) {
      throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
    }

    for (let i = 0; i < args.tagIds.length; i++) {
      const tag = await ctx.db.get(args.tagIds[i]);
      if (!tag || tag.groupId !== args.groupId) {
        throw new ConvexError("無効なタグが指定されました");
      }
      await ctx.db.patch(args.tagIds[i], { sortOrder: i });
    }

    ctx.logger.audit("TAG", "reordered", {
      groupId: args.groupId,
      tagCount: args.tagIds.length,
    });
  },
});

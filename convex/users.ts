import { v, ConvexError } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";

const MAX_DISPLAY_NAME_LENGTH = 20;

/**
 * ユーザー初期化
 *
 * 初回ログイン時にユーザーを作成する。
 * authMutationMiddlewareが自動でユーザーを作成するため、
 * このmutationは単にユーザーIDを返すだけ。
 */
export const ensureUser = authMutation({
  args: {},
  handler: async (ctx) => {
    return ctx.user._id;
  },
});

/**
 * 表示名更新
 */
export const updateDisplayName = authMutation({
  args: {
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.displayName.trim();

    if (trimmed.length === 0) {
      throw new ConvexError("表示名を入力してください");
    }

    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ConvexError(
        `表示名は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください`,
      );
    }

    await ctx.db.patch(ctx.user._id, {
      displayName: trimmed,
      updatedAt: Date.now(),
    });

    ctx.logger.info("USER", "display_name_updated", {
      userId: ctx.user._id,
      newDisplayName: trimmed,
    });
  },
});

/**
 * 現在のユーザー情報取得
 */
export const getMe = authQuery({
  args: {},
  handler: async (ctx) => {
    return {
      _id: ctx.user._id,
      displayName: ctx.user.displayName,
      avatarUrl: ctx.user.avatarUrl,
      defaultGroupId: ctx.user.defaultGroupId,
      isAdmin: ctx.user.isAdmin === true,
    };
  },
});

/**
 * デフォルトグループ設定
 */
export const setDefaultGroup = authMutation({
  args: {
    groupId: v.union(v.id("groups"), v.null()),
  },
  handler: async (ctx, args) => {
    if (args.groupId !== null) {
      await requireGroupMember(ctx, args.groupId);
    }

    await ctx.db.patch(ctx.user._id, {
      defaultGroupId: args.groupId ?? undefined,
      updatedAt: Date.now(),
    });

    ctx.logger.info("USER", "default_group_updated", {
      userId: ctx.user._id,
      defaultGroupId: args.groupId,
    });
  },
});

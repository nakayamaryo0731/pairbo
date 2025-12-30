import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { PRESET_CATEGORIES } from "./lib/presetCategories";
import {
  validateGroupInput,
  GROUP_RULES,
  GroupValidationError,
} from "./domain/group";
import { INVITATION_RULES, calculateExpiresAt } from "./domain/invitation";

/**
 * グループ作成
 *
 * 1. グループをDBに作成
 * 2. 作成者をオーナーとしてメンバーに追加
 * 3. プリセットカテゴリをコピー
 */
export const create = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // バリデーション
    let validated;
    try {
      validated = validateGroupInput({
        name: args.name,
        description: args.description,
      });
    } catch (error) {
      if (error instanceof GroupValidationError) {
        ctx.logger.warn("GROUP", "create_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    const now = Date.now();

    // 1. グループ作成
    const groupId = await ctx.db.insert("groups", {
      name: validated.name,
      description: validated.description,
      closingDay: GROUP_RULES.DEFAULT_CLOSING_DAY,
      createdAt: now,
      updatedAt: now,
    });

    // 2. 作成者をオーナーとして追加
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: ctx.user._id,
      role: "owner",
      joinedAt: now,
    });

    // 3. プリセットカテゴリをコピー
    for (const preset of PRESET_CATEGORIES) {
      await ctx.db.insert("categories", {
        groupId,
        name: preset.name,
        icon: preset.icon,
        isPreset: true,
        sortOrder: preset.sortOrder,
        createdAt: now,
      });
    }

    // 監査ログ
    ctx.logger.audit("GROUP", "created", {
      groupId,
      groupName: validated.name,
    });

    return groupId;
  },
});

/**
 * ユーザーの所属グループ一覧取得
 */
export const listMyGroups = authQuery({
  args: {},
  handler: async (ctx) => {
    // ユーザーのメンバーシップを取得
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    // 各グループの情報を取得
    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

        // グループのメンバー数を取得
        const allMembers = await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", membership.groupId),
          )
          .collect();

        return {
          _id: group._id,
          name: group.name,
          description: group.description,
          closingDay: group.closingDay,
          memberCount: allMembers.length,
          myRole: membership.role,
          joinedAt: membership.joinedAt,
        };
      }),
    );

    // nullを除外し、参加日時の新しい順にソート
    return groups
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

/**
 * グループ詳細取得
 */
export const getDetail = authQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    // 1. グループ情報取得
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    // 2. 自分がメンバーかチェック
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 3. メンバー一覧取得（ユーザー情報含む）
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        if (!user) return null;

        return {
          _id: membership._id,
          userId: user._id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: membership.role,
          joinedAt: membership.joinedAt,
          isMe: user._id === ctx.user._id,
        };
      }),
    );

    // 4. カテゴリ一覧取得
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return {
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        closingDay: group.closingDay,
      },
      members: members
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .sort((a, b) => a.joinedAt - b.joinedAt),
      categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
      myRole: myMembership.role,
    };
  },
});

/**
 * 招待リンク作成
 */
export const createInvitation = authMutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    // 1. グループ存在確認
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      ctx.logger.warn("GROUP", "invitation_create_failed", {
        groupId: args.groupId,
        reason: "group_not_found",
      });
      throw new Error("グループが見つかりません");
    }

    // 2. 権限チェック（オーナーのみ）
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership || myMembership.role !== "owner") {
      ctx.logger.warn("GROUP", "invitation_create_failed", {
        groupId: args.groupId,
        reason: "unauthorized",
      });
      throw new Error("招待リンクを作成する権限がありません");
    }

    // 3. トークン生成（UUID v4形式）
    const token = crypto.randomUUID();

    // 4. 招待レコード作成
    const now = Date.now();
    const expiresAt = calculateExpiresAt(now, INVITATION_RULES.EXPIRATION_MS);

    await ctx.db.insert("groupInvitations", {
      groupId: args.groupId,
      token,
      createdBy: ctx.user._id,
      expiresAt,
      createdAt: now,
    });

    // 監査ログ
    ctx.logger.audit("GROUP", "invitation_created", {
      groupId: args.groupId,
      groupName: group.name,
      expiresAt,
    });

    return { token, expiresAt };
  },
});

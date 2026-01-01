import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember, requireGroupOwner } from "./lib/authorization";
import { PRESET_CATEGORIES } from "./lib/presetCategories";
import { getOrThrow } from "./lib/dataHelpers";
import {
  validateGroupInput,
  validateClosingDay,
  GROUP_RULES,
  GroupValidationError,
} from "./domain/group";
import { INVITATION_RULES, calculateExpiresAt } from "./domain/invitation";

/**
 * グループ作成
 */
export const create = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    const groupId = await ctx.db.insert("groups", {
      name: validated.name,
      description: validated.description,
      closingDay: GROUP_RULES.DEFAULT_CLOSING_DAY,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: ctx.user._id,
      role: "owner",
      joinedAt: now,
    });

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
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const groups = await Promise.all(
      memberships.map(async (membership) => {
        const group = await ctx.db.get(membership.groupId);
        if (!group) return null;

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
    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // 認可チェック
    const myMembership = await requireGroupMember(ctx, args.groupId);

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
    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // オーナー権限チェック
    await requireGroupOwner(ctx, args.groupId);

    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = calculateExpiresAt(now, INVITATION_RULES.EXPIRATION_MS);

    await ctx.db.insert("groupInvitations", {
      groupId: args.groupId,
      token,
      createdBy: ctx.user._id,
      expiresAt,
      createdAt: now,
    });

    ctx.logger.audit("GROUP", "invitation_created", {
      groupId: args.groupId,
      groupName: group.name,
      expiresAt,
    });

    return { token, expiresAt };
  },
});

/**
 * グループ名更新
 */
export const updateName = authMutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // メンバーであれば編集可能
    await requireGroupMember(ctx, args.groupId);

    let validated;
    try {
      validated = validateGroupInput({ name: args.name });
    } catch (error) {
      if (error instanceof GroupValidationError) {
        ctx.logger.warn("GROUP", "update_name_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    await ctx.db.patch(args.groupId, {
      name: validated.name,
      updatedAt: Date.now(),
    });

    ctx.logger.audit("GROUP", "name_updated", {
      groupId: args.groupId,
      oldName: group.name,
      newName: validated.name,
    });
  },
});

/**
 * 締め日更新
 */
export const updateClosingDay = authMutation({
  args: {
    groupId: v.id("groups"),
    closingDay: v.number(),
  },
  handler: async (ctx, args) => {
    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    await requireGroupOwner(ctx, args.groupId);

    try {
      validateClosingDay(args.closingDay);
    } catch (error) {
      if (error instanceof GroupValidationError) {
        ctx.logger.warn("GROUP", "update_closing_day_validation_failed", {
          reason: error.message,
        });
      }
      throw error;
    }

    await ctx.db.patch(args.groupId, {
      closingDay: args.closingDay,
      updatedAt: Date.now(),
    });

    ctx.logger.audit("GROUP", "closing_day_updated", {
      groupId: args.groupId,
      oldClosingDay: group.closingDay,
      newClosingDay: args.closingDay,
    });
  },
});

/**
 * グループ削除
 */
export const remove = authMutation({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // オーナー権限チェック
    await requireGroupOwner(ctx, args.groupId);

    // 関連データを削除（順序重要）

    // 1. 支出分割を削除
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const expense of expenses) {
      const splits = await ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();
      await Promise.all(splits.map((split) => ctx.db.delete(split._id)));
    }

    // 2. 支出を削除
    await Promise.all(expenses.map((expense) => ctx.db.delete(expense._id)));

    // 3. 精算支払いを削除
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const settlement of settlements) {
      const payments = await ctx.db
        .query("settlementPayments")
        .withIndex("by_settlement", (q) => q.eq("settlementId", settlement._id))
        .collect();
      await Promise.all(payments.map((payment) => ctx.db.delete(payment._id)));
    }

    // 4. 精算を削除
    await Promise.all(
      settlements.map((settlement) => ctx.db.delete(settlement._id)),
    );

    // 5. 買い物リストアイテムを削除
    const shoppingItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", args.groupId))
      .collect();
    await Promise.all(shoppingItems.map((item) => ctx.db.delete(item._id)));

    // 6. カテゴリを削除
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    await Promise.all(
      categories.map((category) => ctx.db.delete(category._id)),
    );

    // 7. 招待を削除
    const invitations = await ctx.db
      .query("groupInvitations")
      .filter((q) => q.eq(q.field("groupId"), args.groupId))
      .collect();
    await Promise.all(
      invitations.map((invitation) => ctx.db.delete(invitation._id)),
    );

    // 8. メンバーを削除
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();
    await Promise.all(members.map((member) => ctx.db.delete(member._id)));

    // 9. グループ本体を削除
    await ctx.db.delete(args.groupId);

    ctx.logger.audit("GROUP", "deleted", {
      groupId: args.groupId,
      groupName: group.name,
      deletedData: {
        expenses: expenses.length,
        settlements: settlements.length,
        shoppingItems: shoppingItems.length,
        categories: categories.length,
        members: members.length,
      },
    });
  },
});

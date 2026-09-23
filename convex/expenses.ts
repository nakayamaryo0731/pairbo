import { v, ConvexError } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import {
  requireGroupMember,
  requireUserIsGroupMember,
} from "./lib/authorization";
import { getGroupMemberIds } from "./lib/groupHelper";
import { getExpensesByPeriod } from "./lib/expenseHelper";
import { getOrThrow } from "./lib/dataHelpers";
import { enrichExpenseList, FALLBACK } from "./lib/enrichment";
import { canUseTags, canUseSlopedSplit } from "./lib/subscription";
import {
  calculateSplits,
  validateExpenseInput,
  validateSplitDetails,
  validateTitle,
  resolveTargetMemberIds,
  type SplitDetails,
} from "./domain/expense";
import { getSettlementPeriod } from "./domain/settlement";
import type { ClosingDay } from "./domain/group/types";
import { TAG_LIMITS } from "./domain/tag";
import type { Id } from "./_generated/dataModel";
import { splitDetailsValidator } from "./lib/validators";
import { insertRecurringTemplate } from "./recurringExpenses";

export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    date: v.string(),
    title: v.optional(v.string()),
    memo: v.optional(v.string()),
    splitDetails: v.optional(splitDetailsValidator),
    shoppingItemIds: v.optional(v.array(v.id("shoppingItems"))),
    tagIds: v.optional(v.array(v.id("tags"))),
    // 指定すると同じ内容の定期支出テンプレートも作成する（翌月分から自動生成）
    recurring: v.optional(v.object({ dayOfMonth: v.number() })),
  },
  handler: async (ctx, args) => {
    validateExpenseInput({
      amount: args.amount,
      date: args.date,
      memo: args.memo,
    });

    // タイトルのバリデーション
    const validatedTitle = validateTitle(args.title);

    // グループ存在確認
    await getOrThrow(ctx, args.groupId, "グループが見つかりません");

    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const category = await ctx.db.get("categories", args.categoryId);
    if (!category || category.groupId !== args.groupId) {
      throw new ConvexError("カテゴリが見つかりません");
    }

    // 支払者がグループメンバーであることを確認
    await requireUserIsGroupMember(
      ctx,
      args.groupId,
      args.paidBy,
      "支払者がグループメンバーではありません",
    );

    // グループメンバーIDを取得
    const allMemberIds = await getGroupMemberIds(ctx, args.groupId);

    const splitDetails: SplitDetails = args.splitDetails ?? { method: "equal" };

    // 分割対象メンバーを決定
    const targetMemberIds = resolveTargetMemberIds(splitDetails, allMemberIds);

    validateSplitDetails(splitDetails, args.amount, targetMemberIds);

    if (splitDetails.method === "ratio" || splitDetails.method === "amount") {
      const canUse = await canUseSlopedSplit(ctx, args.groupId);
      if (!canUse) {
        throw new ConvexError(
          "傾斜折半機能はPremiumプランでご利用いただけます",
        );
      }
    }

    const splits = calculateSplits(
      splitDetails,
      args.amount,
      targetMemberIds,
      args.paidBy,
    );

    // 買い物リスト連携時はアイテム名をタイトルに設定
    let title = validatedTitle;
    if (!title && args.shoppingItemIds && args.shoppingItemIds.length > 0) {
      const items = await Promise.all(
        args.shoppingItemIds.map((id) => ctx.db.get("shoppingItems", id)),
      );
      const itemNames = items
        .filter((item) => item !== null)
        .map((item) => item.name);
      if (itemNames.length > 0) {
        if (itemNames.length <= 3) {
          title = itemNames.join(", ");
        } else {
          title = `${itemNames.slice(0, 3).join(", ")} 他${itemNames.length - 3}件`;
        }
      }
    }

    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      amount: args.amount,
      categoryId: args.categoryId,
      paidBy: args.paidBy,
      date: args.date,
      title,
      memo: args.memo?.trim() || undefined,
      splitMethod: splitDetails.method,
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all(
      splits.map((split) =>
        ctx.db.insert("expenseSplits", {
          expenseId,
          userId: split.userId,
          amount: split.amount,
        }),
      ),
    );

    // 買い物リストアイテムとの連携
    if (args.shoppingItemIds && args.shoppingItemIds.length > 0) {
      const now = Date.now();
      await Promise.all(
        args.shoppingItemIds.map(async (itemId) => {
          const item = await ctx.db.get("shoppingItems", itemId);
          if (
            item &&
            item.groupId === args.groupId &&
            item.purchasedAt === undefined
          ) {
            await ctx.db.patch("shoppingItems", itemId, {
              purchasedAt: now,
              purchasedBy: ctx.user._id,
              linkedExpenseId: expenseId,
            });
          }
        }),
      );

      ctx.logger.info("SHOPPING", "items_linked_to_expense", {
        expenseId,
        shoppingItemIds: args.shoppingItemIds,
      });
    }

    // タグの紐付け
    if (args.tagIds && args.tagIds.length > 0) {
      // Premium機能チェック
      const canUse = await canUseTags(ctx, args.groupId);
      if (!canUse) {
        throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
      }

      // タグ数上限チェック
      if (args.tagIds.length > TAG_LIMITS.MAX_TAGS_PER_EXPENSE) {
        throw new ConvexError(
          `1つの支出につき最大${TAG_LIMITS.MAX_TAGS_PER_EXPENSE}個のタグを設定できます`,
        );
      }

      // タグの存在確認とグループ所属確認
      const now = Date.now();
      for (const tagId of args.tagIds) {
        const tag = await ctx.db.get("tags", tagId);
        if (!tag || tag.groupId !== args.groupId) {
          throw new ConvexError("無効なタグが指定されました");
        }

        // expenseTagsに追加
        await ctx.db.insert("expenseTags", {
          expenseId,
          tagId,
        });

        // タグのlastUsedAtを更新
        await ctx.db.patch("tags", tagId, { lastUsedAt: now });
      }

      ctx.logger.info("TAG", "tags_linked_to_expense", {
        expenseId,
        tagIds: args.tagIds,
      });
    }

    // 定期支出テンプレートの同時作成
    if (args.recurring) {
      if (!title) {
        throw new ConvexError("定期支出として登録するにはタイトルが必要です");
      }
      await insertRecurringTemplate(ctx, {
        groupId: args.groupId,
        amount: args.amount,
        categoryId: args.categoryId,
        paidBy: args.paidBy,
        dayOfMonth: args.recurring.dayOfMonth,
        title,
        splitDetails,
        // 今回の支出が記録済みの月は自動生成をスキップする
        lastGeneratedMonth: args.date.slice(0, 7),
      });
    }

    ctx.logger.audit("EXPENSE", "created", {
      expenseId,
      groupId: args.groupId,
      amount: args.amount,
      splitMethod: splitDetails.method,
      categoryName: category.name,
      tagCount: args.tagIds?.length ?? 0,
    });

    return expenseId;
  },
});

/**
 * グループの支出一覧取得
 */
export const listByGroup = authQuery({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const expensesQuery = ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .order("desc");

    const expenses = args.limit
      ? await expensesQuery.take(args.limit)
      : await expensesQuery.collect();

    return enrichExpenseList(ctx, expenses);
  },
});

/**
 * 支出詳細取得
 */
export const getById = authQuery({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    const [
      category,
      payer,
      createdByUser,
      splits,
      expenseTags,
      linkedShoppingItems,
    ] = await Promise.all([
      ctx.db.get("categories", expense.categoryId),
      ctx.db.get("users", expense.paidBy),
      ctx.db.get("users", expense.createdBy),
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
      ctx.db
        .query("expenseTags")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
      ctx.db
        .query("shoppingItems")
        .withIndex("by_linked_expense", (q) =>
          q.eq("linkedExpenseId", expense._id),
        )
        .collect(),
    ]);

    // タグ情報を取得
    const tags = await Promise.all(
      expenseTags.map((et) => ctx.db.get("tags", et.tagId)),
    );
    const validTags = tags.filter((t) => t !== null);

    const splitUserIds = [...new Set(splits.map((s) => s.userId))];
    const splitUsers = await Promise.all(
      splitUserIds.map((id) => ctx.db.get("users", id)),
    );
    const userMap = new Map(
      splitUsers
        .filter((u) => u !== null)
        .map((u) => [
          u._id,
          { displayName: u.displayName, avatarUrl: u.avatarUrl },
        ]),
    );

    return {
      _id: expense._id,
      groupId: expense.groupId,
      amount: expense.amount,
      date: expense.date,
      title: expense.title,
      memo: expense.memo,
      splitMethod: expense.splitMethod,
      category: category
        ? { _id: category._id, name: category.name, icon: category.icon }
        : null,
      payer: payer
        ? {
            _id: payer._id,
            displayName: payer.displayName,
            avatarUrl: payer.avatarUrl,
          }
        : null,
      splits: splits.map((split) => {
        const user = userMap.get(split.userId);
        return {
          userId: split.userId,
          displayName: user?.displayName ?? FALLBACK.USER_NAME,
          avatarUrl: user?.avatarUrl,
          amount: split.amount,
        };
      }),
      createdBy: createdByUser
        ? { _id: createdByUser._id, displayName: createdByUser.displayName }
        : null,
      tags: validTags.map((t) => ({
        _id: t._id,
        name: t.name,
        color: t.color,
      })),
      linkedShoppingItems: linkedShoppingItems.map((item) => ({
        _id: item._id,
        name: item.name,
      })),
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  },
});

/**
 * 精算期間内の支出一覧取得
 */
export const listByPeriod = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    // 期間内の支出を取得（日付降順にソート）
    const expenses = (
      await getExpensesByPeriod(ctx, args.groupId, period)
    ).sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b._creationTime - a._creationTime,
    );

    const enrichedExpenses = await enrichExpenseList(ctx, expenses);

    return {
      period,
      expenses: enrichedExpenses,
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * カテゴリ別・期間内の支出一覧取得
 */
export const listByCategory = authQuery({
  args: {
    groupId: v.id("groups"),
    categoryId: v.id("categories"),
    year: v.number(),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    const category = await ctx.db.get("categories", args.categoryId);
    if (!category || category.groupId !== args.groupId) {
      throw new ConvexError("カテゴリが見つかりません");
    }

    const { period, periodLabel } = resolveYearOrMonth(group.closingDay, args);

    const filteredExpenses = await getExpensesByPeriod(
      ctx,
      args.groupId,
      period,
    );

    // カテゴリでフィルタ
    const categoryExpenses = filteredExpenses
      .filter((e) => e.categoryId === args.categoryId)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b._creationTime - a._creationTime,
      );

    const enrichedExpenses = await enrichExpenseList(ctx, categoryExpenses);

    return {
      category: {
        _id: category._id,
        name: category.name,
        icon: category.icon,
      },
      periodLabel,
      expenses: enrichedExpenses,
      totalCount: categoryExpenses.length,
      totalAmount: categoryExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * タグ別・期間内の支出一覧取得
 */
export const listByTag = authQuery({
  args: {
    groupId: v.id("groups"),
    tagId: v.union(v.id("tags"), v.literal("untagged")),
    year: v.number(),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    const { period, periodLabel } = resolveYearOrMonth(group.closingDay, args);

    const filteredExpenses = await getExpensesByPeriod(
      ctx,
      args.groupId,
      period,
    );

    let tagExpenses;
    let tagInfo: { _id: string; name: string; color: string } | null = null;

    if (args.tagId === "untagged") {
      const taggedExpenseIds = await collectTaggedExpenseIds(
        ctx,
        filteredExpenses.map((e) => e._id),
      );
      tagExpenses = filteredExpenses.filter(
        (e) => !taggedExpenseIds.has(e._id),
      );
    } else {
      // 特定タグの支出
      const tagIdForQuery = args.tagId as Id<"tags">;
      const tag = await ctx.db.get("tags", tagIdForQuery);
      if (!tag || tag.groupId !== args.groupId) {
        throw new ConvexError("タグが見つかりません");
      }
      tagInfo = { _id: tag._id, name: tag.name, color: tag.color };

      const expenseTags = await ctx.db
        .query("expenseTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tagIdForQuery))
        .collect();

      const taggedExpenseIds = new Set(expenseTags.map((et) => et.expenseId));
      tagExpenses = filteredExpenses.filter((e) => taggedExpenseIds.has(e._id));
    }

    // 日付降順でソート
    tagExpenses = tagExpenses.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b._creationTime - a._creationTime,
    );

    const enrichedExpenses = await enrichExpenseList(ctx, tagExpenses);

    return {
      tag: tagInfo,
      isUntagged: args.tagId === "untagged",
      periodLabel,
      expenses: enrichedExpenses,
      totalCount: tagExpenses.length,
      totalAmount: tagExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * 全期間カテゴリ別支出一覧取得
 */
export const listByCategoryAllTime = authQuery({
  args: {
    groupId: v.id("groups"),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const category = await ctx.db.get("categories", args.categoryId);
    if (!category || category.groupId !== args.groupId) {
      throw new ConvexError("カテゴリが見つかりません");
    }

    // 全支出を取得（カテゴリでフィルタ）
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const categoryExpenses = allExpenses
      .filter((e) => e.categoryId === args.categoryId)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b._creationTime - a._creationTime,
      );

    const enrichedExpenses = await enrichExpenseList(ctx, categoryExpenses);

    // 期間ラベル
    const dates = categoryExpenses.map((e) => e.date).sort();
    const periodLabel =
      dates.length > 0 ? `${dates[0]} 〜 ${dates[dates.length - 1]}` : null;

    return {
      category: {
        _id: category._id,
        name: category.name,
        icon: category.icon,
      },
      periodLabel,
      expenses: enrichedExpenses,
      totalCount: categoryExpenses.length,
      totalAmount: categoryExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * 全期間タグ別支出一覧取得
 */
export const listByTagAllTime = authQuery({
  args: {
    groupId: v.id("groups"),
    tagId: v.union(v.id("tags"), v.literal("untagged")),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // 全支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    let tagExpenses;
    let tagInfo: { _id: string; name: string; color: string } | null = null;

    if (args.tagId === "untagged") {
      const taggedExpenseIds = await collectTaggedExpenseIds(
        ctx,
        allExpenses.map((e) => e._id),
      );
      tagExpenses = allExpenses.filter((e) => !taggedExpenseIds.has(e._id));
    } else {
      // 特定タグの支出
      const tagIdForQuery = args.tagId as Id<"tags">;
      const tag = await ctx.db.get("tags", tagIdForQuery);
      if (!tag || tag.groupId !== args.groupId) {
        throw new ConvexError("タグが見つかりません");
      }
      tagInfo = { _id: tag._id, name: tag.name, color: tag.color };

      const expenseTags = await ctx.db
        .query("expenseTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tagIdForQuery))
        .collect();

      const taggedExpenseIds = new Set(expenseTags.map((et) => et.expenseId));
      tagExpenses = allExpenses.filter((e) => taggedExpenseIds.has(e._id));
    }

    // 日付降順でソート
    tagExpenses = tagExpenses.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b._creationTime - a._creationTime,
    );

    const enrichedExpenses = await enrichExpenseList(ctx, tagExpenses);

    // 期間ラベル
    const dates = tagExpenses.map((e) => e.date).sort();
    const periodLabel =
      dates.length > 0 ? `${dates[0]} 〜 ${dates[dates.length - 1]}` : null;

    return {
      tag: tagInfo,
      isUntagged: args.tagId === "untagged",
      periodLabel,
      expenses: enrichedExpenses,
      totalCount: tagExpenses.length,
      totalAmount: tagExpenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * 支出更新
 */
export const update = authMutation({
  args: {
    expenseId: v.id("expenses"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    date: v.string(),
    title: v.optional(v.string()),
    memo: v.optional(v.string()),
    splitDetails: v.optional(splitDetailsValidator),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );
    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    // バリデーション
    validateExpenseInput({
      amount: args.amount,
      date: args.date,
      memo: args.memo,
    });

    // タイトルのバリデーション
    const validatedTitle = validateTitle(args.title);

    const category = await ctx.db.get("categories", args.categoryId);
    if (!category || category.groupId !== expense.groupId) {
      throw new ConvexError("カテゴリが見つかりません");
    }

    // 支払者がグループメンバーであることを確認
    await requireUserIsGroupMember(
      ctx,
      expense.groupId,
      args.paidBy,
      "支払者がグループメンバーではありません",
    );

    // グループメンバーIDを取得
    const allMemberIds = await getGroupMemberIds(ctx, expense.groupId);

    const splitDetails: SplitDetails = args.splitDetails ?? { method: "equal" };

    // 分割対象メンバーを決定
    const targetMemberIds = resolveTargetMemberIds(splitDetails, allMemberIds);

    validateSplitDetails(splitDetails, args.amount, targetMemberIds);

    if (splitDetails.method === "ratio" || splitDetails.method === "amount") {
      const canUse = await canUseSlopedSplit(ctx, expense.groupId);
      if (!canUse) {
        throw new ConvexError(
          "傾斜折半機能はPremiumプランでご利用いただけます",
        );
      }
    }

    const splits = calculateSplits(
      splitDetails,
      args.amount,
      targetMemberIds,
      args.paidBy,
    );

    // 既存のsplitsを削除
    const existingSplits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(
      existingSplits.map((split) => ctx.db.delete("expenseSplits", split._id)),
    );

    // 支出を更新
    await ctx.db.patch("expenses", args.expenseId, {
      amount: args.amount,
      categoryId: args.categoryId,
      paidBy: args.paidBy,
      date: args.date,
      title: validatedTitle,
      memo: args.memo?.trim() || undefined,
      splitMethod: splitDetails.method,
      updatedAt: Date.now(),
    });

    // 新しいsplitsを作成
    await Promise.all(
      splits.map((split) =>
        ctx.db.insert("expenseSplits", {
          expenseId: args.expenseId,
          userId: split.userId,
          amount: split.amount,
        }),
      ),
    );

    // タグの更新（tagIdsが指定された場合のみ）
    if (args.tagIds !== undefined) {
      // 既存のexpenseTagsを削除
      const existingExpenseTags = await ctx.db
        .query("expenseTags")
        .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
        .collect();

      await Promise.all(
        existingExpenseTags.map((et) => ctx.db.delete("expenseTags", et._id)),
      );

      // 新しいタグを追加
      if (args.tagIds.length > 0) {
        // Premium機能チェック
        const canUse = await canUseTags(ctx, expense.groupId);
        if (!canUse) {
          throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
        }

        // タグ数上限チェック
        if (args.tagIds.length > TAG_LIMITS.MAX_TAGS_PER_EXPENSE) {
          throw new ConvexError(
            `1つの支出につき最大${TAG_LIMITS.MAX_TAGS_PER_EXPENSE}個のタグを設定できます`,
          );
        }

        const now = Date.now();
        for (const tagId of args.tagIds) {
          const tag = await ctx.db.get("tags", tagId);
          if (!tag || tag.groupId !== expense.groupId) {
            throw new ConvexError("無効なタグが指定されました");
          }

          await ctx.db.insert("expenseTags", {
            expenseId: args.expenseId,
            tagId,
          });

          // タグのlastUsedAtを更新
          await ctx.db.patch("tags", tagId, { lastUsedAt: now });
        }
      }
    }

    ctx.logger.audit("EXPENSE", "updated", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      amount: args.amount,
      splitMethod: splitDetails.method,
      categoryName: category.name,
      tagCount: args.tagIds?.length,
    });

    return args.expenseId;
  },
});

/**
 * 支出削除
 */
export const remove = authMutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );
    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    // 関連するsplitsを削除
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(
      splits.map((split) => ctx.db.delete("expenseSplits", split._id)),
    );

    // 関連するexpenseTagsを削除
    const expenseTags = await ctx.db
      .query("expenseTags")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(
      expenseTags.map((et) => ctx.db.delete("expenseTags", et._id)),
    );

    // 買い物リストアイテムの連携解除（購入済み状態は維持）
    const linkedItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_linked_expense", (q) =>
        q.eq("linkedExpenseId", args.expenseId),
      )
      .collect();

    if (linkedItems.length > 0) {
      await Promise.all(
        linkedItems.map((item) =>
          ctx.db.patch("shoppingItems", item._id, {
            linkedExpenseId: undefined,
          }),
        ),
      );

      ctx.logger.info("SHOPPING", "items_unlinked_from_expense", {
        expenseId: args.expenseId,
        itemCount: linkedItems.length,
      });
    }

    // 支出を削除
    await ctx.db.delete("expenses", args.expenseId);

    ctx.logger.audit("EXPENSE", "deleted", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      amount: expense.amount,
    });
  },
});

export const updateCategory = authMutation({
  args: {
    expenseId: v.id("expenses"),
    categoryId: v.id("categories"),
  },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );

    await requireGroupMember(ctx, expense.groupId);

    const category = await ctx.db.get("categories", args.categoryId);
    if (!category || category.groupId !== expense.groupId) {
      throw new ConvexError("カテゴリが見つかりません");
    }

    await ctx.db.patch("expenses", args.expenseId, {
      categoryId: args.categoryId,
      updatedAt: Date.now(),
    });

    ctx.logger.audit("EXPENSE", "category_updated", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      categoryName: category.name,
    });
  },
});

export const updateTags = authMutation({
  args: {
    expenseId: v.id("expenses"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );

    await requireGroupMember(ctx, expense.groupId);

    if (args.tagIds.length > 0) {
      const canUse = await canUseTags(ctx, expense.groupId);
      if (!canUse) {
        throw new ConvexError("タグ機能はPremiumプランでご利用いただけます");
      }

      if (args.tagIds.length > TAG_LIMITS.MAX_TAGS_PER_EXPENSE) {
        throw new ConvexError(
          `1つの支出につき最大${TAG_LIMITS.MAX_TAGS_PER_EXPENSE}個のタグを設定できます`,
        );
      }
    }

    // 既存のexpenseTagsを削除
    const existingExpenseTags = await ctx.db
      .query("expenseTags")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(
      existingExpenseTags.map((et) => ctx.db.delete("expenseTags", et._id)),
    );

    // 新しいタグを追加
    const now = Date.now();
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get("tags", tagId);
      if (!tag || tag.groupId !== expense.groupId) {
        throw new ConvexError("無効なタグが指定されました");
      }

      await ctx.db.insert("expenseTags", {
        expenseId: args.expenseId,
        tagId,
      });

      await ctx.db.patch("tags", tagId, { lastUsedAt: now });
    }

    await ctx.db.patch("expenses", args.expenseId, {
      updatedAt: Date.now(),
    });

    ctx.logger.audit("EXPENSE", "tags_updated", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      tagCount: args.tagIds.length,
    });
  },
});

// ========================================
// ヘルパー
// ========================================

/**
 * 年単位 / 月単位の引数から期間とラベルを導出する。
 * - month あり → 締め日基準の精算期間
 * - month なし → 1/1〜12/31
 */
function resolveYearOrMonth(
  closingDay: ClosingDay,
  args: { year: number; month?: number },
): { period: { startDate: string; endDate: string }; periodLabel: string } {
  if (args.month !== undefined) {
    return {
      period: getSettlementPeriod(closingDay, args.year, args.month),
      periodLabel: `${args.year}年${args.month}月`,
    };
  }
  return {
    period: {
      startDate: `${args.year}-01-01`,
      endDate: `${args.year}-12-31`,
    },
    periodLabel: `${args.year}年`,
  };
}

/**
 * 与えられた expenseIds のうち、何らかのタグが付与されているものの集合を返す。
 * expenseTags テーブル全体を走査せず、expenseId ごとの index lookup で済ませる。
 */
async function collectTaggedExpenseIds(
  ctx: { db: import("./_generated/server").DatabaseReader },
  expenseIds: Id<"expenses">[],
): Promise<Set<Id<"expenses">>> {
  const tagsByExpense = await Promise.all(
    expenseIds.map((id) =>
      ctx.db
        .query("expenseTags")
        .withIndex("by_expense", (q) => q.eq("expenseId", id))
        .first(),
    ),
  );
  const result = new Set<Id<"expenses">>();
  expenseIds.forEach((id, i) => {
    if (tagsByExpense[i] !== null) result.add(id);
  });
  return result;
}

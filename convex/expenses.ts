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
import {
  calculateEqualSplit,
  calculateRatioSplit,
  calculateAmountSplit,
  calculateFullSplit,
  validateExpenseInput,
  validateSplitDetails,
  validateTitle,
  resolveTargetMemberIds,
  type SplitDetails,
  type SplitResult,
} from "./domain/expense";
import {
  getSettlementPeriod,
  getSettlementYearMonthForDate,
} from "./domain/settlement";

const splitDetailsValidator = v.union(
  v.object({
    method: v.literal("equal"),
    memberIds: v.optional(v.array(v.id("users"))),
  }),
  v.object({
    method: v.literal("ratio"),
    ratios: v.array(v.object({ userId: v.id("users"), ratio: v.number() })),
  }),
  v.object({
    method: v.literal("amount"),
    amounts: v.array(v.object({ userId: v.id("users"), amount: v.number() })),
  }),
  v.object({ method: v.literal("full"), bearerId: v.id("users") }),
);

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

    const category = await ctx.db.get(args.categoryId);
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
        args.shoppingItemIds.map((id) => ctx.db.get(id)),
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
          const item = await ctx.db.get(itemId);
          if (
            item &&
            item.groupId === args.groupId &&
            item.purchasedAt === undefined
          ) {
            await ctx.db.patch(itemId, {
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

    ctx.logger.audit("EXPENSE", "created", {
      expenseId,
      groupId: args.groupId,
      amount: args.amount,
      splitMethod: splitDetails.method,
      categoryName: category.name,
    });

    return expenseId;
  },
});

function calculateSplits(
  details: SplitDetails,
  amount: number,
  memberIds: import("./_generated/dataModel").Id<"users">[],
  payerId: import("./_generated/dataModel").Id<"users">,
): SplitResult[] {
  switch (details.method) {
    case "equal":
      return calculateEqualSplit(amount, memberIds, payerId);
    case "ratio":
      return calculateRatioSplit(amount, details.ratios, payerId);
    case "amount":
      return calculateAmountSplit(details.amounts);
    case "full":
      return calculateFullSplit(amount, memberIds, details.bearerId);
  }
}

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
    const group = await getOrThrow(
      ctx,
      expense.groupId,
      "グループが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    const [category, payer, createdByUser, splits] = await Promise.all([
      ctx.db.get(expense.categoryId),
      ctx.db.get(expense.paidBy),
      ctx.db.get(expense.createdBy),
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
    ]);

    // 精算済みチェック
    const isSettled = await isExpenseSettled(
      ctx,
      expense.date,
      expense.groupId,
      group.closingDay,
    );

    const splitUserIds = [...new Set(splits.map((s) => s.userId))];
    const splitUsers = await Promise.all(
      splitUserIds.map((id) => ctx.db.get(id)),
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
      isSettled,
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
    ).sort((a, b) => b.date.localeCompare(a.date));

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
 * 支出が精算済みかどうかをチェック
 */
async function isExpenseSettled(
  ctx: { db: import("./_generated/server").DatabaseReader },
  expenseDate: string,
  groupId: import("./_generated/dataModel").Id<"groups">,
  closingDay: number,
): Promise<boolean> {
  const { year, month } = getSettlementYearMonthForDate(
    expenseDate,
    closingDay,
  );
  const period = getSettlementPeriod(closingDay, year, month);

  const existingSettlement = await ctx.db
    .query("settlements")
    .withIndex("by_group_and_period", (q) =>
      q.eq("groupId", groupId).eq("periodStart", period.startDate),
    )
    .unique();

  return existingSettlement !== null;
}

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
  },
  handler: async (ctx, args) => {
    const expense = await getOrThrow(
      ctx,
      args.expenseId,
      "支出が見つかりません",
    );
    const group = await getOrThrow(
      ctx,
      expense.groupId,
      "グループが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    // 精算済みチェック
    const isSettled = await isExpenseSettled(
      ctx,
      expense.date,
      expense.groupId,
      group.closingDay,
    );
    if (isSettled) {
      throw new ConvexError("精算済みの期間の支出は編集できません");
    }

    // バリデーション
    validateExpenseInput({
      amount: args.amount,
      date: args.date,
      memo: args.memo,
    });

    // タイトルのバリデーション
    const validatedTitle = validateTitle(args.title);

    const category = await ctx.db.get(args.categoryId);
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

    await Promise.all(existingSplits.map((split) => ctx.db.delete(split._id)));

    // 支出を更新
    await ctx.db.patch(args.expenseId, {
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

    ctx.logger.audit("EXPENSE", "updated", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      amount: args.amount,
      splitMethod: splitDetails.method,
      categoryName: category.name,
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
    const group = await getOrThrow(
      ctx,
      expense.groupId,
      "グループが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, expense.groupId);

    // 精算済みチェック
    const isSettled = await isExpenseSettled(
      ctx,
      expense.date,
      expense.groupId,
      group.closingDay,
    );
    if (isSettled) {
      throw new ConvexError("精算済みの期間の支出は削除できません");
    }

    // 関連するsplitsを削除
    const splits = await ctx.db
      .query("expenseSplits")
      .withIndex("by_expense", (q) => q.eq("expenseId", args.expenseId))
      .collect();

    await Promise.all(splits.map((split) => ctx.db.delete(split._id)));

    // 買い物リストアイテムの連携解除（購入済み状態は維持）
    const linkedItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) =>
        q.eq("groupId", expense.groupId),
      )
      .filter((q) => q.eq(q.field("linkedExpenseId"), args.expenseId))
      .collect();

    if (linkedItems.length > 0) {
      await Promise.all(
        linkedItems.map((item) =>
          ctx.db.patch(item._id, {
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
    await ctx.db.delete(args.expenseId);

    ctx.logger.audit("EXPENSE", "deleted", {
      expenseId: args.expenseId,
      groupId: expense.groupId,
      amount: expense.amount,
    });
  },
});

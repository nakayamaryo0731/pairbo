import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import {
  calculateEqualSplit,
  calculateRatioSplit,
  calculateAmountSplit,
  calculateFullSplit,
  validateExpenseInput,
  validateSplitDetails,
  type SplitDetails,
  type SplitResult,
} from "./domain/expense";
import { getSettlementPeriod } from "./domain/settlement";

const splitDetailsValidator = v.union(
  v.object({ method: v.literal("equal") }),
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
    memo: v.optional(v.string()),
    splitDetails: v.optional(splitDetailsValidator),
  },
  handler: async (ctx, args) => {
    validateExpenseInput({
      amount: args.amount,
      date: args.date,
      memo: args.memo,
    });

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.groupId !== args.groupId) {
      throw new Error("カテゴリが見つかりません");
    }

    const payerMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.paidBy),
      )
      .unique();

    if (!payerMembership) {
      throw new Error("支払者がグループメンバーではありません");
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();

    const memberIds = memberships.map((m) => m.userId);

    const splitDetails: SplitDetails = args.splitDetails ?? { method: "equal" };
    validateSplitDetails(splitDetails, args.amount, memberIds);

    const splits = calculateSplits(
      splitDetails,
      args.amount,
      memberIds,
      args.paidBy,
    );

    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      amount: args.amount,
      categoryId: args.categoryId,
      paidBy: args.paidBy,
      date: args.date,
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
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    const expensesQuery = ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .order("desc");

    const expenses = args.limit
      ? await expensesQuery.take(args.limit)
      : await expensesQuery.collect();

    if (expenses.length === 0) {
      return [];
    }

    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
    const payerIds = [...new Set(expenses.map((e) => e.paidBy))];

    const [categories, payers] = await Promise.all([
      Promise.all(categoryIds.map((id) => ctx.db.get(id))),
      Promise.all(payerIds.map((id) => ctx.db.get(id))),
    ]);

    const categoryMap = new Map(
      categories
        .filter((c) => c !== null)
        .map((c) => [c._id, { _id: c._id, name: c.name, icon: c.icon }]),
    );
    const userMap = new Map(
      payers
        .filter((u) => u !== null)
        .map((u) => [
          u._id,
          { _id: u._id, displayName: u.displayName, avatarUrl: u.avatarUrl },
        ]),
    );

    const allSplits = await Promise.all(
      expenses.map((expense) =>
        ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect(),
      ),
    );

    const splitUserIds = [
      ...new Set(allSplits.flat().map((s) => s.userId)),
    ].filter((id) => !userMap.has(id));

    if (splitUserIds.length > 0) {
      const splitUsers = await Promise.all(
        splitUserIds.map((id) => ctx.db.get(id)),
      );
      for (const user of splitUsers) {
        if (user) {
          userMap.set(user._id, {
            _id: user._id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          });
        }
      }
    }

    return expenses.map((expense, index) => {
      const category = categoryMap.get(expense.categoryId);
      const payer = userMap.get(expense.paidBy);
      const splits = allSplits[index];

      return {
        _id: expense._id,
        amount: expense.amount,
        date: expense.date,
        memo: expense.memo,
        splitMethod: expense.splitMethod,
        category: category ?? null,
        payer: payer ?? null,
        splits: splits.map((split) => {
          const user = userMap.get(split.userId);
          return {
            userId: split.userId,
            displayName: user?.displayName ?? "不明なユーザー",
            amount: split.amount,
          };
        }),
        createdAt: expense.createdAt,
      };
    });
  },
});

/**
 * 支出詳細取得
 */
export const getById = authQuery({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("支出が見つかりません");
    }

    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", expense.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("この支出にアクセスする権限がありません");
    }

    const [category, payer, createdByUser, splits] = await Promise.all([
      ctx.db.get(expense.categoryId),
      ctx.db.get(expense.paidBy),
      ctx.db.get(expense.createdBy),
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
    ]);

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
          displayName: user?.displayName ?? "不明なユーザー",
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
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    const expenses = allExpenses.filter(
      (e) => e.date >= period.startDate && e.date <= period.endDate,
    );

    if (expenses.length === 0) {
      return {
        period,
        expenses: [],
        totalCount: 0,
        totalAmount: 0,
      };
    }

    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
    const payerIds = [...new Set(expenses.map((e) => e.paidBy))];

    const [categories, payers] = await Promise.all([
      Promise.all(categoryIds.map((id) => ctx.db.get(id))),
      Promise.all(payerIds.map((id) => ctx.db.get(id))),
    ]);

    const categoryMap = new Map(
      categories
        .filter((c) => c !== null)
        .map((c) => [c._id, { _id: c._id, name: c.name, icon: c.icon }]),
    );
    const userMap = new Map(
      payers
        .filter((u) => u !== null)
        .map((u) => [
          u._id,
          { _id: u._id, displayName: u.displayName, avatarUrl: u.avatarUrl },
        ]),
    );

    const allSplits = await Promise.all(
      expenses.map((expense) =>
        ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect(),
      ),
    );

    const splitUserIds = [
      ...new Set(allSplits.flat().map((s) => s.userId)),
    ].filter((id) => !userMap.has(id));

    if (splitUserIds.length > 0) {
      const splitUsers = await Promise.all(
        splitUserIds.map((id) => ctx.db.get(id)),
      );
      for (const user of splitUsers) {
        if (user) {
          userMap.set(user._id, {
            _id: user._id,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          });
        }
      }
    }

    const mappedExpenses = expenses.map((expense, index) => {
      const category = categoryMap.get(expense.categoryId);
      const payer = userMap.get(expense.paidBy);
      const splits = allSplits[index];

      return {
        _id: expense._id,
        amount: expense.amount,
        date: expense.date,
        memo: expense.memo,
        splitMethod: expense.splitMethod,
        category: category ?? null,
        payer: payer ?? null,
        splits: splits.map((split) => {
          const user = userMap.get(split.userId);
          return {
            userId: split.userId,
            displayName: user?.displayName ?? "不明なユーザー",
            amount: split.amount,
          };
        }),
        createdAt: expense.createdAt,
      };
    });

    return {
      period,
      expenses: mappedExpenses,
      totalCount: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

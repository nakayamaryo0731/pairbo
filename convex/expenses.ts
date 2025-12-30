import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { calculateEqualSplit } from "./lib/splitCalculator";

/**
 * 支出登録（Phase 1: 均等分割のみ）
 */
export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    date: v.string(),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. バリデーション
    if (!Number.isInteger(args.amount)) {
      throw new Error("金額は整数で入力してください");
    }
    if (args.amount < 1 || args.amount > 100_000_000) {
      throw new Error("金額は1円から1億円の範囲で入力してください");
    }
    if (args.memo && args.memo.length > 500) {
      throw new Error("メモは500文字以内で入力してください");
    }

    // 日付フォーマット検証（YYYY-MM-DD）
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.date)) {
      throw new Error("日付の形式が正しくありません");
    }

    // 未来日チェック
    const today = new Date().toISOString().split("T")[0];
    if (args.date > today) {
      throw new Error("未来の日付は指定できません");
    }

    // 2. グループ存在確認
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    // 3. 自分がメンバーかチェック
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 4. カテゴリがこのグループのものか確認
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.groupId !== args.groupId) {
      throw new Error("カテゴリが見つかりません");
    }

    // 5. 支払者がグループメンバーか確認
    const payerMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", args.paidBy),
      )
      .unique();

    if (!payerMembership) {
      throw new Error("支払者がグループメンバーではありません");
    }

    // 6. グループメンバー全員のIDを取得
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();

    const memberIds = memberships.map((m) => m.userId);

    // 7. 均等分割で負担配分を計算
    const splits = calculateEqualSplit(args.amount, memberIds, args.paidBy);

    // 8. 支出を保存
    const now = Date.now();
    const expenseId = await ctx.db.insert("expenses", {
      groupId: args.groupId,
      amount: args.amount,
      categoryId: args.categoryId,
      paidBy: args.paidBy,
      date: args.date,
      memo: args.memo?.trim() || undefined,
      splitMethod: "equal",
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });

    // 9. 負担配分を並列保存
    await Promise.all(
      splits.map((split) =>
        ctx.db.insert("expenseSplits", {
          expenseId,
          userId: split.userId,
          amount: split.amount,
        }),
      ),
    );

    // 監査ログ
    ctx.logger.audit("EXPENSE", "created", {
      expenseId,
      groupId: args.groupId,
      amount: args.amount,
      categoryName: category.name,
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
    // 1. 自分がメンバーかチェック
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 2. 支出一覧を取得（日付降順）
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

    // 3. ユニークなIDを収集
    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
    const payerIds = [...new Set(expenses.map((e) => e.paidBy))];

    // 4. バッチでカテゴリと支払者を取得
    const [categories, payers] = await Promise.all([
      Promise.all(categoryIds.map((id) => ctx.db.get(id))),
      Promise.all(payerIds.map((id) => ctx.db.get(id))),
    ]);

    // Mapに格納
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

    // 5. 全支出の分割を並列取得
    const allSplits = await Promise.all(
      expenses.map((expense) =>
        ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
          .collect(),
      ),
    );

    // 6. 分割に含まれるユーザーIDを収集して追加取得
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

    // 7. 結果を構築
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
    // 1. 支出を取得
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("支出が見つかりません");
    }

    // 2. 自分がメンバーかチェック
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", expense.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("この支出にアクセスする権限がありません");
    }

    // 3. 詳細情報を並列取得
    const [category, payer, createdByUser, splits] = await Promise.all([
      ctx.db.get(expense.categoryId),
      ctx.db.get(expense.paidBy),
      ctx.db.get(expense.createdBy),
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
    ]);

    // 4. 分割のユーザー情報をバッチ取得
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

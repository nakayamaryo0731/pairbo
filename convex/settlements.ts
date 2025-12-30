import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import {
  calculateBalances,
  minimizeTransfers,
  getSettlementPeriod,
  validateSettlementPeriodInput,
  SettlementValidationError,
} from "./domain/settlement";

/**
 * 精算プレビュー取得（未確定の精算額）
 */
export const getPreview = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. バリデーション
    try {
      validateSettlementPeriodInput(args.year, args.month);
    } catch (error) {
      if (error instanceof SettlementValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }

    // 2. グループ存在確認
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    // 3. メンバー確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 4. 精算期間計算
    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    // 5. グループメンバー取得
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();
    const memberIds = memberships.map((m) => m.userId);

    // 6. 期間内の支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const expenses = allExpenses.filter(
      (e) => e.date >= period.startDate && e.date <= period.endDate,
    );

    // 7. 支出の分割情報を取得
    const expenseIds = expenses.map((e) => e._id);
    const allSplits = await Promise.all(
      expenseIds.map((expenseId) =>
        ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
          .collect(),
      ),
    );
    const splits = allSplits.flat();

    // 8. 収支計算
    const balances = calculateBalances(expenses, splits, memberIds);

    // 9. 精算額計算
    const payments = minimizeTransfers(balances);

    // 10. 既存の精算があるかチェック
    const existingSettlement = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) =>
        q.eq("groupId", args.groupId).eq("periodStart", period.startDate),
      )
      .unique();

    // 11. ユーザー情報を付加
    const balancesWithUsers = await Promise.all(
      balances.map(async (b) => {
        const user = await ctx.db.get(b.userId);
        return {
          ...b,
          displayName: user?.displayName ?? "不明なユーザー",
        };
      }),
    );

    const paymentsWithUsers = await Promise.all(
      payments.map(async (p) => {
        const fromUser = await ctx.db.get(p.fromUserId);
        const toUser = await ctx.db.get(p.toUserId);
        return {
          ...p,
          fromUserName: fromUser?.displayName ?? "不明なユーザー",
          toUserName: toUser?.displayName ?? "不明なユーザー",
        };
      }),
    );

    return {
      period,
      balances: balancesWithUsers,
      payments: paymentsWithUsers,
      existingSettlementId: existingSettlement?._id ?? null,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
    };
  },
});

/**
 * 精算を確定
 */
export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. バリデーション
    try {
      validateSettlementPeriodInput(args.year, args.month);
    } catch (error) {
      if (error instanceof SettlementValidationError) {
        ctx.logger.warn("SETTLEMENT", "create_validation_failed", {
          reason: error.message,
        });
        throw new Error(error.message);
      }
      throw error;
    }

    // 2. グループ存在確認
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      ctx.logger.warn("SETTLEMENT", "create_failed", {
        groupId: args.groupId,
        reason: "group_not_found",
      });
      throw new Error("グループが見つかりません");
    }

    // 3. オーナー権限チェック
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership || myMembership.role !== "owner") {
      ctx.logger.warn("SETTLEMENT", "create_failed", {
        groupId: args.groupId,
        reason: "unauthorized",
      });
      throw new Error("精算を確定する権限がありません");
    }

    // 4. 精算期間計算
    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    // 5. 期間重複チェック
    const existingSettlement = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) =>
        q.eq("groupId", args.groupId).eq("periodStart", period.startDate),
      )
      .unique();

    if (existingSettlement) {
      ctx.logger.warn("SETTLEMENT", "create_failed", {
        groupId: args.groupId,
        reason: "already_exists",
        period,
      });
      throw new Error("この期間の精算は既に確定されています");
    }

    // 6. グループメンバー取得
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();
    const memberIds = memberships.map((m) => m.userId);

    // 7. 期間内の支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const expenses = allExpenses.filter(
      (e) => e.date >= period.startDate && e.date <= period.endDate,
    );

    // 8. 支出の分割情報を取得
    const expenseIds = expenses.map((e) => e._id);
    const allSplits = await Promise.all(
      expenseIds.map((expenseId) =>
        ctx.db
          .query("expenseSplits")
          .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
          .collect(),
      ),
    );
    const splits = allSplits.flat();

    // 9. 収支計算
    const balances = calculateBalances(expenses, splits, memberIds);

    // 10. 精算額計算
    const payments = minimizeTransfers(balances);

    // 11. Settlement保存
    const now = Date.now();
    const settlementId = await ctx.db.insert("settlements", {
      groupId: args.groupId,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      status: payments.length === 0 ? "settled" : "pending",
      settledAt: payments.length === 0 ? now : undefined,
      createdBy: ctx.user._id,
      createdAt: now,
    });

    // 12. SettlementPayment保存
    for (const payment of payments) {
      await ctx.db.insert("settlementPayments", {
        settlementId,
        fromUserId: payment.fromUserId,
        toUserId: payment.toUserId,
        amount: payment.amount,
        isPaid: false,
      });
    }

    // 監査ログ
    ctx.logger.audit("SETTLEMENT", "created", {
      settlementId,
      groupId: args.groupId,
      period,
      paymentCount: payments.length,
    });

    return settlementId;
  },
});

/**
 * 支払い完了をマーク
 */
export const markPaid = authMutation({
  args: {
    paymentId: v.id("settlementPayments"),
  },
  handler: async (ctx, args) => {
    // 1. Payment取得
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("支払い情報が見つかりません");
    }

    // 2. Settlement取得
    const settlement = await ctx.db.get(payment.settlementId);
    if (!settlement) {
      throw new Error("精算情報が見つかりません");
    }

    // 3. 権限チェック（受取人のみ）
    if (payment.toUserId !== ctx.user._id) {
      ctx.logger.warn("SETTLEMENT", "mark_paid_failed", {
        paymentId: args.paymentId,
        reason: "unauthorized",
      });
      throw new Error("支払い完了をマークする権限がありません");
    }

    // 4. 既に支払い済みかチェック
    if (payment.isPaid) {
      return { alreadyPaid: true };
    }

    // 5. Payment更新
    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      isPaid: true,
      paidAt: now,
    });

    // 6. 全Payment完了チェック
    const allPayments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", payment.settlementId),
      )
      .collect();

    const allPaid = allPayments.every(
      (p) => p._id === args.paymentId || p.isPaid,
    );

    // 7. 全員完了なら Settlement を settled に
    if (allPaid) {
      await ctx.db.patch(payment.settlementId, {
        status: "settled",
        settledAt: now,
      });
    }

    // 監査ログ
    ctx.logger.audit("SETTLEMENT", "payment_marked_paid", {
      paymentId: args.paymentId,
      settlementId: payment.settlementId,
      allCompleted: allPaid,
    });

    return { success: true, allCompleted: allPaid };
  },
});

/**
 * 精算一覧取得
 */
export const listByGroup = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 1. メンバー確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("このグループにアクセスする権限がありません");
    }

    // 2. 精算一覧取得
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 3. 各精算の支払い情報を取得
    const settlementsWithPayments = await Promise.all(
      settlements.map(async (settlement) => {
        const payments = await ctx.db
          .query("settlementPayments")
          .withIndex("by_settlement", (q) =>
            q.eq("settlementId", settlement._id),
          )
          .collect();

        const paidCount = payments.filter((p) => p.isPaid).length;

        return {
          _id: settlement._id,
          periodStart: settlement.periodStart,
          periodEnd: settlement.periodEnd,
          status: settlement.status,
          settledAt: settlement.settledAt,
          createdAt: settlement.createdAt,
          paymentCount: payments.length,
          paidCount,
        };
      }),
    );

    // 新しい順にソート
    return settlementsWithPayments.sort((a, b) =>
      b.periodStart.localeCompare(a.periodStart),
    );
  },
});

/**
 * 精算詳細取得
 */
export const getById = authQuery({
  args: {
    settlementId: v.id("settlements"),
  },
  handler: async (ctx, args) => {
    // 1. Settlement取得
    const settlement = await ctx.db.get(args.settlementId);
    if (!settlement) {
      throw new Error("精算情報が見つかりません");
    }

    // 2. メンバー確認
    const myMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", settlement.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (!myMembership) {
      throw new Error("この精算にアクセスする権限がありません");
    }

    // 3. グループ情報取得
    const group = await ctx.db.get(settlement.groupId);

    // 4. Payment取得（ユーザー情報付き）
    const payments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", args.settlementId),
      )
      .collect();

    const paymentsWithUsers = await Promise.all(
      payments.map(async (payment) => {
        const fromUser = await ctx.db.get(payment.fromUserId);
        const toUser = await ctx.db.get(payment.toUserId);
        return {
          _id: payment._id,
          fromUserId: payment.fromUserId,
          fromUserName: fromUser?.displayName ?? "不明なユーザー",
          toUserId: payment.toUserId,
          toUserName: toUser?.displayName ?? "不明なユーザー",
          amount: payment.amount,
          isPaid: payment.isPaid,
          paidAt: payment.paidAt,
          canMarkPaid: payment.toUserId === ctx.user._id && !payment.isPaid,
        };
      }),
    );

    // 5. 作成者情報取得
    const creator = await ctx.db.get(settlement.createdBy);

    return {
      _id: settlement._id,
      groupId: settlement.groupId,
      groupName: group?.name ?? "不明なグループ",
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      status: settlement.status,
      settledAt: settlement.settledAt,
      createdBy: settlement.createdBy,
      creatorName: creator?.displayName ?? "不明なユーザー",
      createdAt: settlement.createdAt,
      payments: paymentsWithUsers,
    };
  },
});

import { v } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember, requireGroupOwner } from "./lib/authorization";
import { getGroupMemberIds } from "./lib/groupHelper";
import { getExpensesByPeriod } from "./lib/expenseHelper";
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
    try {
      validateSettlementPeriodInput(args.year, args.month);
    } catch (error) {
      if (error instanceof SettlementValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("グループが見つかりません");
    }

    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    const memberIds = await getGroupMemberIds(ctx, args.groupId);
    const expenses = await getExpensesByPeriod(ctx, args.groupId, period);

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

    const balances = calculateBalances(expenses, splits, memberIds);
    const payments = minimizeTransfers(balances);

    const existingSettlement = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) =>
        q.eq("groupId", args.groupId).eq("periodStart", period.startDate),
      )
      .unique();

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

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      ctx.logger.warn("SETTLEMENT", "create_failed", {
        groupId: args.groupId,
        reason: "group_not_found",
      });
      throw new Error("グループが見つかりません");
    }

    // オーナー権限チェック
    await requireGroupOwner(ctx, args.groupId);

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

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

    const memberIds = await getGroupMemberIds(ctx, args.groupId);
    const expenses = await getExpensesByPeriod(ctx, args.groupId, period);

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

    const balances = calculateBalances(expenses, splits, memberIds);
    const payments = minimizeTransfers(balances);

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

    for (const payment of payments) {
      await ctx.db.insert("settlementPayments", {
        settlementId,
        fromUserId: payment.fromUserId,
        toUserId: payment.toUserId,
        amount: payment.amount,
        isPaid: false,
      });
    }

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
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) {
      throw new Error("支払い情報が見つかりません");
    }

    const settlement = await ctx.db.get(payment.settlementId);
    if (!settlement) {
      throw new Error("精算情報が見つかりません");
    }

    if (payment.toUserId !== ctx.user._id) {
      ctx.logger.warn("SETTLEMENT", "mark_paid_failed", {
        paymentId: args.paymentId,
        reason: "unauthorized",
      });
      throw new Error("支払い完了をマークする権限がありません");
    }

    if (payment.isPaid) {
      return { alreadyPaid: true };
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      isPaid: true,
      paidAt: now,
    });

    const allPayments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", payment.settlementId),
      )
      .collect();

    const allPaid = allPayments.every(
      (p) => p._id === args.paymentId || p.isPaid,
    );

    if (allPaid) {
      await ctx.db.patch(payment.settlementId, {
        status: "settled",
        settledAt: now,
      });
    }

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
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) => q.eq("groupId", args.groupId))
      .collect();

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
    const settlement = await ctx.db.get(args.settlementId);
    if (!settlement) {
      throw new Error("精算情報が見つかりません");
    }

    // 認可チェック
    await requireGroupMember(ctx, settlement.groupId);

    const group = await ctx.db.get(settlement.groupId);

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

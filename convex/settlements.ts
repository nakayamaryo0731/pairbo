import { v, ConvexError } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { requireGroupMember, requireGroupOwner } from "./lib/authorization";
import { getGroupMemberIds } from "./lib/groupHelper";
import { getExpensesByPeriod } from "./lib/expenseHelper";
import { getOrThrow } from "./lib/dataHelpers";
import { createUserMap, FALLBACK } from "./lib/enrichment";
import {
  calculateBalances,
  minimizeTransfers,
  applyCarryover,
  getSettlementPeriod,
  validateSettlementPeriodInput,
  SettlementValidationError,
  type SettlementPeriod,
} from "./domain/settlement";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import type { Logger } from "./lib/logger";

function validatePeriodInputOrThrow(
  logger: Logger,
  year: number,
  month: number,
  logEvent: string,
) {
  try {
    validateSettlementPeriodInput(year, month);
  } catch (error) {
    if (error instanceof SettlementValidationError) {
      logger.warn("SETTLEMENT", logEvent, { reason: error.message });
      throw new ConvexError(error.message);
    }
    throw error;
  }
}

/**
 * 直前の精算が「繰り越し」の場合、その精算と送金リストを返す
 */
async function getCarryover(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  periodStart: string,
) {
  const previous = await ctx.db
    .query("settlements")
    .withIndex("by_group_and_period", (q) =>
      q.eq("groupId", groupId).lt("periodStart", periodStart),
    )
    .order("desc")
    .first();

  if (!previous || previous.status !== "carried_over") {
    return null;
  }

  const payments = await ctx.db
    .query("settlementPayments")
    .withIndex("by_settlement", (q) => q.eq("settlementId", previous._id))
    .collect();

  return { settlement: previous, payments };
}

/**
 * 指定期間より後の精算を取得（繰り越し・確定の順序整合性チェック用）
 */
async function findLaterSettlement(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  periodStart: string,
) {
  return await ctx.db
    .query("settlements")
    .withIndex("by_group_and_period", (q) =>
      q.eq("groupId", groupId).gt("periodStart", periodStart),
    )
    .first();
}

/**
 * 期間内の支出 + 直前の繰越から収支・送金リストを計算する共通処理
 */
async function computeSettlementForPeriod(
  ctx: QueryCtx,
  groupId: Id<"groups">,
  period: SettlementPeriod,
) {
  const memberIds = await getGroupMemberIds(ctx, groupId);
  const expenses = await getExpensesByPeriod(ctx, groupId, period);

  const allSplits = await Promise.all(
    expenses.map((expense) =>
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
    ),
  );
  const splits = allSplits.flat();

  let balances = calculateBalances(expenses, splits, memberIds);

  const carryover = await getCarryover(ctx, groupId, period.startDate);
  if (carryover) {
    balances = applyCarryover(balances, carryover.payments);
  }

  const payments = minimizeTransfers(balances);

  return { expenses, balances, payments, carryover };
}

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
    validatePeriodInputOrThrow(
      ctx.logger,
      args.year,
      args.month,
      "preview_validation_failed",
    );

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    const { expenses, balances, payments, carryover } =
      await computeSettlementForPeriod(ctx, args.groupId, period);

    const existingSettlement = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) =>
        q.eq("groupId", args.groupId).eq("periodStart", period.startDate),
      )
      .unique();

    // この期間が繰越済みの場合、後続の精算ができるまでは取り消せる
    const canCancelCarryover =
      existingSettlement?.status === "carried_over" &&
      !(await findLaterSettlement(ctx, args.groupId, period.startDate));

    const allUserIds = [
      ...balances.map((b) => b.userId),
      ...payments.flatMap((p) => [p.fromUserId, p.toUserId]),
    ];
    const userMap = await createUserMap(ctx, allUserIds);

    const balancesWithUsers = balances.map((b) => ({
      ...b,
      displayName: userMap.get(b.userId)?.displayName ?? FALLBACK.USER_NAME,
    }));

    const paymentsWithUsers = payments.map((p) => ({
      ...p,
      fromUserName:
        userMap.get(p.fromUserId)?.displayName ?? FALLBACK.USER_NAME,
      toUserName: userMap.get(p.toUserId)?.displayName ?? FALLBACK.USER_NAME,
    }));

    return {
      period,
      balances: balancesWithUsers,
      payments: paymentsWithUsers,
      existingSettlementId: existingSettlement?._id ?? null,
      existingSettlementStatus: existingSettlement?.status ?? null,
      canCancelCarryover,
      carryover: carryover
        ? {
            settlementId: carryover.settlement._id,
            amount: carryover.payments.reduce((sum, p) => sum + p.amount, 0),
            periodStart: carryover.settlement.periodStart,
            periodEnd: carryover.settlement.periodEnd,
          }
        : null,
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
    validatePeriodInputOrThrow(
      ctx.logger,
      args.year,
      args.month,
      "create_validation_failed",
    );

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // メンバー権限チェック（オーナー以外も精算確定可能）
    await requireGroupMember(ctx, args.groupId);

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
      throw new ConvexError("この期間の精算は既に確定されています");
    }

    // 後続の精算に繰越が焼き込まれている可能性があるため、期間の逆順での確定は許可しない
    if (await findLaterSettlement(ctx, args.groupId, period.startDate)) {
      throw new ConvexError(
        "これより後の期間の精算が既に存在するため確定できません",
      );
    }

    const { payments, carryover } = await computeSettlementForPeriod(
      ctx,
      args.groupId,
      period,
    );

    const now = Date.now();
    const settlementId = await ctx.db.insert("settlements", {
      groupId: args.groupId,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      status: payments.length === 0 ? "settled" : "pending",
      settledAt: payments.length === 0 ? now : undefined,
      carryoverFrom: carryover?.settlement._id,
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
 * 差額を翌月に繰り越す（精算せず、次の精算に合算する）
 */
export const carryOver = authMutation({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    validatePeriodInputOrThrow(
      ctx.logger,
      args.year,
      args.month,
      "carry_over_validation_failed",
    );

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    await requireGroupMember(ctx, args.groupId);

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);

    const existingSettlement = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) =>
        q.eq("groupId", args.groupId).eq("periodStart", period.startDate),
      )
      .unique();

    if (existingSettlement) {
      throw new ConvexError("この期間の精算は既に確定されています");
    }

    // 合算先となる後続の精算が既に存在する場合は繰り越せない
    if (await findLaterSettlement(ctx, args.groupId, period.startDate)) {
      throw new ConvexError(
        "これより後の期間の精算が既に存在するため繰り越せません",
      );
    }

    const { payments, carryover } = await computeSettlementForPeriod(
      ctx,
      args.groupId,
      period,
    );

    if (payments.length === 0) {
      throw new ConvexError("繰り越す差額がありません");
    }

    const now = Date.now();
    const settlementId = await ctx.db.insert("settlements", {
      groupId: args.groupId,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      status: "carried_over",
      carryoverFrom: carryover?.settlement._id,
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

    ctx.logger.audit("SETTLEMENT", "carried_over", {
      settlementId,
      groupId: args.groupId,
      period,
      paymentCount: payments.length,
    });

    return settlementId;
  },
});

/**
 * 繰り越しの取り消し（後続の精算に合算される前のみ）
 */
export const cancelCarryOver = authMutation({
  args: {
    settlementId: v.id("settlements"),
  },
  handler: async (ctx, args) => {
    const settlement = await getOrThrow(
      ctx,
      args.settlementId,
      "精算情報が見つかりません",
    );

    await requireGroupMember(ctx, settlement.groupId);

    if (settlement.status !== "carried_over") {
      throw new ConvexError("繰り越しされた精算ではありません");
    }

    if (
      await findLaterSettlement(ctx, settlement.groupId, settlement.periodStart)
    ) {
      throw new ConvexError("後の期間の精算に合算済みのため取り消せません");
    }

    const payments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", args.settlementId),
      )
      .collect();

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }
    await ctx.db.delete(args.settlementId);

    ctx.logger.audit("SETTLEMENT", "carry_over_cancelled", {
      settlementId: args.settlementId,
      groupId: settlement.groupId,
    });

    return { success: true };
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
    const payment = await getOrThrow(
      ctx,
      args.paymentId,
      "支払い情報が見つかりません",
    );
    const settlement = await getOrThrow(
      ctx,
      payment.settlementId,
      "精算情報が見つかりません",
    );

    await requireGroupMember(ctx, settlement.groupId);

    if (settlement.status === "carried_over") {
      throw new ConvexError("繰り越しされた精算は支払い対象ではありません");
    }

    if (payment.toUserId !== ctx.user._id) {
      ctx.logger.warn("SETTLEMENT", "mark_paid_failed", {
        paymentId: args.paymentId,
        reason: "unauthorized",
      });
      throw new ConvexError("支払い完了をマークする権限がありません");
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
 * 精算を再オープン（未精算に戻す）
 */
export const reopen = authMutation({
  args: {
    settlementId: v.id("settlements"),
  },
  handler: async (ctx, args) => {
    const settlement = await getOrThrow(
      ctx,
      args.settlementId,
      "精算情報が見つかりません",
    );

    await requireGroupOwner(ctx, settlement.groupId);

    if (settlement.status === "carried_over") {
      throw new ConvexError(
        "繰り越しされた精算は再オープンできません。繰り越しの取り消しを使ってください",
      );
    }

    if (settlement.status === "reopened") {
      throw new ConvexError("この精算は既に再オープンされています");
    }

    if (settlement.status === "pending") {
      throw new ConvexError("この精算はまだ完了していません");
    }

    await ctx.db.patch(args.settlementId, {
      status: "reopened",
      settledAt: undefined,
    });

    const payments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", args.settlementId),
      )
      .collect();

    for (const payment of payments) {
      await ctx.db.patch(payment._id, {
        isPaid: false,
        paidAt: undefined,
      });
    }

    ctx.logger.audit("SETTLEMENT", "reopened", {
      settlementId: args.settlementId,
      groupId: settlement.groupId,
    });

    return { success: true };
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

    const allPayments = await Promise.all(
      settlements.map((s) =>
        ctx.db
          .query("settlementPayments")
          .withIndex("by_settlement", (q) => q.eq("settlementId", s._id))
          .collect(),
      ),
    );

    const settlementsWithPayments = settlements.map((settlement, i) => {
      const payments = allPayments[i];
      return {
        _id: settlement._id,
        periodStart: settlement.periodStart,
        periodEnd: settlement.periodEnd,
        status: settlement.status,
        settledAt: settlement.settledAt,
        createdAt: settlement.createdAt,
        paymentCount: payments.length,
        paidCount: payments.filter((p) => p.isPaid).length,
      };
    });

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
    const settlement = await getOrThrow(
      ctx,
      args.settlementId,
      "精算情報が見つかりません",
    );

    // 認可チェック
    const membership = await requireGroupMember(ctx, settlement.groupId);
    const isOwner = membership.role === "owner";

    const group = await ctx.db.get(settlement.groupId);

    const payments = await ctx.db
      .query("settlementPayments")
      .withIndex("by_settlement", (q) =>
        q.eq("settlementId", args.settlementId),
      )
      .collect();

    const userIds = [
      ...payments.flatMap((p) => [p.fromUserId, p.toUserId]),
      settlement.createdBy,
    ];
    const userMap = await createUserMap(ctx, userIds);

    const paymentsWithUsers = payments.map((payment) => ({
      _id: payment._id,
      fromUserId: payment.fromUserId,
      fromUserName:
        userMap.get(payment.fromUserId)?.displayName ?? FALLBACK.USER_NAME,
      toUserId: payment.toUserId,
      toUserName:
        userMap.get(payment.toUserId)?.displayName ?? FALLBACK.USER_NAME,
      amount: payment.amount,
      isPaid: payment.isPaid,
      paidAt: payment.paidAt,
      canMarkPaid:
        settlement.status !== "carried_over" &&
        payment.toUserId === ctx.user._id &&
        !payment.isPaid,
    }));

    return {
      _id: settlement._id,
      groupId: settlement.groupId,
      groupName: group?.name ?? FALLBACK.GROUP_NAME,
      periodStart: settlement.periodStart,
      periodEnd: settlement.periodEnd,
      status: settlement.status,
      settledAt: settlement.settledAt,
      createdBy: settlement.createdBy,
      creatorName:
        userMap.get(settlement.createdBy)?.displayName ?? FALLBACK.USER_NAME,
      createdAt: settlement.createdAt,
      payments: paymentsWithUsers,
      isOwner,
    };
  },
});

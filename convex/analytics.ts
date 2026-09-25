import { v } from "convex/values";
import { authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";
import { getSettlementPeriod, getSettlementLabel } from "./domain/settlement";
import { getExpensesByPeriod } from "./lib/expenseHelper";
import { getOrThrow } from "./lib/dataHelpers";
import { buildCategoryBreakdown } from "./lib/analyticsHelper";
import { canUseTags, canAccessYearlyAnalytics } from "./lib/subscription";
import { calculateTagBreakdown } from "./lib/tagAnalyticsHelper";

/**
 * カテゴリ別支出集計
 */
export const getCategoryBreakdown = authQuery({
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

    const expenses = await getExpensesByPeriod(ctx, args.groupId, period);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (expenses.length === 0) {
      return {
        period: {
          startDate: period.startDate,
          endDate: period.endDate,
        },
        totalAmount: 0,
        breakdown: [],
      };
    }

    const breakdown = await buildCategoryBreakdown(ctx, expenses, totalAmount);

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
      },
      totalAmount,
      breakdown,
    };
  },
});

/**
 * 年間カテゴリ別支出集計
 */
export const getYearlyCategoryBreakdown = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const canUse = await canAccessYearlyAnalytics(ctx, args.groupId);
    if (!canUse) {
      return {
        year: args.year,
        totalAmount: 0,
        breakdown: [],
      };
    }

    // 年間の支出を取得
    const expenses = await getExpensesByPeriod(ctx, args.groupId, {
      startDate: `${args.year}-01-01`,
      endDate: `${args.year}-12-31`,
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (expenses.length === 0) {
      return {
        year: args.year,
        totalAmount: 0,
        breakdown: [],
      };
    }

    const breakdown = await buildCategoryBreakdown(ctx, expenses, totalAmount);

    return {
      year: args.year,
      totalAmount,
      breakdown,
    };
  },
});

/**
 * 月別支出推移
 */
export const getMonthlyTrend = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    const monthsToFetch = args.months ?? 6;

    // 過去Nヶ月分の期間を計算（古い月から順）
    const periods: {
      year: number;
      month: number;
      period: { startDate: string; endDate: string };
      isCurrent: boolean;
    }[] = [];
    for (let i = monthsToFetch - 1; i >= 0; i--) {
      let targetYear = args.year;
      let targetMonth = args.month - i;

      // 月の調整
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      periods.push({
        year: targetYear,
        month: targetMonth,
        period: getSettlementPeriod(group.closingDay, targetYear, targetMonth),
        isCurrent: i === 0,
      });
    }

    if (periods.length === 0) {
      return { trend: [] };
    }

    // N期間は連続区間なので、最古の開始日〜最新の終了日の1回のrange検索で全件取得できる
    const expenses = await getExpensesByPeriod(ctx, args.groupId, {
      startDate: periods[0].period.startDate,
      endDate: periods[periods.length - 1].period.endDate,
    });

    const trend = periods.map(({ year, month, period, isCurrent }) => {
      const amount = expenses
        .filter((e) => e.date >= period.startDate && e.date <= period.endDate)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        year,
        month,
        label: getSettlementLabel(year, month),
        amount,
        isCurrent,
      };
    });

    return { trend };
  },
});

/**
 * タグ別支出集計（Premium機能）
 */
export const getTagBreakdown = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, args.groupId);
    if (!canUse) {
      return {
        period: { startDate: "", endDate: "" },
        totalAmount: 0,
        breakdown: [],
        untaggedAmount: 0,
        isPremium: false,
      };
    }

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    const period = getSettlementPeriod(group.closingDay, args.year, args.month);
    const expenses = await getExpensesByPeriod(ctx, args.groupId, period);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const { breakdown, untaggedAmount } = await calculateTagBreakdown(
      ctx,
      expenses,
      totalAmount,
    );

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
      },
      totalAmount,
      breakdown,
      untaggedAmount,
      isPremium: true,
    };
  },
});

/**
 * 年間タグ別支出集計（Premium機能）
 */
export const getYearlyTagBreakdown = authQuery({
  args: {
    groupId: v.id("groups"),
    year: v.number(),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, args.groupId);
    if (!canUse) {
      return {
        year: args.year,
        totalAmount: 0,
        breakdown: [],
        untaggedAmount: 0,
        isPremium: false,
      };
    }

    // 年間の支出を取得
    const expenses = await getExpensesByPeriod(ctx, args.groupId, {
      startDate: `${args.year}-01-01`,
      endDate: `${args.year}-12-31`,
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const { breakdown, untaggedAmount } = await calculateTagBreakdown(
      ctx,
      expenses,
      totalAmount,
    );

    return {
      year: args.year,
      totalAmount,
      breakdown,
      untaggedAmount,
      isPremium: true,
    };
  },
});

/**
 * 全期間カテゴリ別支出集計（Premium機能）
 */
export const getAllTimeCategoryBreakdown = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    const canUse = await canAccessYearlyAnalytics(ctx, args.groupId);
    if (!canUse) {
      return {
        totalAmount: 0,
        breakdown: [],
        periodLabel: null,
      };
    }

    // 全支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const totalAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (allExpenses.length === 0) {
      return {
        totalAmount: 0,
        breakdown: [],
        periodLabel: null,
      };
    }

    // 期間ラベル（最初の支出〜最後の支出）
    const dates = allExpenses.map((e) => e.date).sort();
    const periodLabel = `${dates[0]} 〜 ${dates[dates.length - 1]}`;

    const breakdown = await buildCategoryBreakdown(
      ctx,
      allExpenses,
      totalAmount,
    );

    return {
      totalAmount,
      breakdown,
      periodLabel,
    };
  },
});

/**
 * 全期間タグ別支出集計（Premium機能）
 */
export const getAllTimeTagBreakdown = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    // 認可チェック
    await requireGroupMember(ctx, args.groupId);

    // Premium機能チェック
    const canUse = await canUseTags(ctx, args.groupId);
    if (!canUse) {
      return {
        totalAmount: 0,
        breakdown: [],
        untaggedAmount: 0,
        periodLabel: null,
        isPremium: false,
      };
    }

    // 全支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const totalAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (allExpenses.length === 0) {
      return {
        totalAmount: 0,
        breakdown: [],
        untaggedAmount: 0,
        periodLabel: null,
        isPremium: true,
      };
    }

    // 期間ラベル（最初の支出〜最後の支出）
    const dates = allExpenses.map((e) => e.date).sort();
    const periodLabel = `${dates[0]} 〜 ${dates[dates.length - 1]}`;

    const { breakdown, untaggedAmount } = await calculateTagBreakdown(
      ctx,
      allExpenses,
      totalAmount,
    );

    return {
      totalAmount,
      breakdown,
      untaggedAmount,
      periodLabel,
      isPremium: true,
    };
  },
});

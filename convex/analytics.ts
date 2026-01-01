import { v } from "convex/values";
import { authQuery } from "./lib/auth";
import { requireGroupMember } from "./lib/authorization";
import { getSettlementPeriod, getSettlementLabel } from "./domain/settlement";
import { getExpensesByPeriod } from "./lib/expenseHelper";
import { getOrThrow } from "./lib/dataHelpers";
import type { Id } from "./_generated/dataModel";

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

    // カテゴリ別に集計
    const categoryTotals = new Map<Id<"categories">, number>();
    for (const expense of expenses) {
      const categoryId = expense.categoryId;
      const current = categoryTotals.get(categoryId) ?? 0;
      categoryTotals.set(categoryId, current + expense.amount);
    }

    // カテゴリ情報を取得
    const categoryIds = [...categoryTotals.keys()];
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id)),
    );

    const breakdown = categoryIds
      .map((categoryId, index) => {
        const category = categories[index];
        const amount = categoryTotals.get(categoryId) ?? 0;
        const percentage =
          totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0;

        return {
          categoryId,
          categoryName: category?.name ?? "不明なカテゴリ",
          categoryIcon: category?.icon ?? "❓",
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

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

    // 年の開始日と終了日を計算
    const startDate = `${args.year}-01-01`;
    const endDate = `${args.year}-12-31`;

    // 年間の支出を取得
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    const expenses = allExpenses.filter(
      (e) => e.date >= startDate && e.date <= endDate,
    );

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    if (expenses.length === 0) {
      return {
        year: args.year,
        totalAmount: 0,
        breakdown: [],
      };
    }

    // カテゴリ別に集計
    const categoryTotals = new Map<Id<"categories">, number>();
    for (const expense of expenses) {
      const categoryId = expense.categoryId;
      const current = categoryTotals.get(categoryId) ?? 0;
      categoryTotals.set(categoryId, current + expense.amount);
    }

    // カテゴリ情報を取得
    const categoryIds = [...categoryTotals.keys()];
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id)),
    );

    const breakdown = categoryIds
      .map((categoryId, index) => {
        const category = categories[index];
        const amount = categoryTotals.get(categoryId) ?? 0;
        const percentage =
          totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0;

        return {
          categoryId,
          categoryName: category?.name ?? "不明なカテゴリ",
          categoryIcon: category?.icon ?? "❓",
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

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
    const trend: {
      year: number;
      month: number;
      label: string;
      amount: number;
      isCurrent: boolean;
    }[] = [];

    // 全支出を一度に取得（効率化のため）
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .collect();

    // 過去N ヶ月分の期間を計算
    for (let i = monthsToFetch - 1; i >= 0; i--) {
      let targetYear = args.year;
      let targetMonth = args.month - i;

      // 月の調整
      while (targetMonth <= 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      const period = getSettlementPeriod(
        group.closingDay,
        targetYear,
        targetMonth,
      );
      const label = getSettlementLabel(targetYear, targetMonth);

      // 期間内の支出を集計
      const periodExpenses = allExpenses.filter(
        (e) => e.date >= period.startDate && e.date <= period.endDate,
      );
      const amount = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

      trend.push({
        year: targetYear,
        month: targetMonth,
        label,
        amount,
        isCurrent: i === 0,
      });
    }

    return { trend };
  },
});

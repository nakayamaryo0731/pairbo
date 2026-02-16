import type { DatabaseReader } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";

/**
 * 精算期間
 */
export interface SettlementPeriod {
  startDate: string;
  endDate: string;
}

/**
 * 指定期間内の支出を取得
 *
 * @param ctx - データベースコンテキスト
 * @param groupId - グループID
 * @param period - 期間（startDate, endDate）
 * @returns 期間内の支出一覧（日付降順）
 */
export async function getExpensesByPeriod(
  ctx: { db: DatabaseReader },
  groupId: Id<"groups">,
  period: SettlementPeriod,
): Promise<Doc<"expenses">[]> {
  const allExpenses = await ctx.db
    .query("expenses")
    .withIndex("by_group_and_date", (q) => q.eq("groupId", groupId))
    .collect();

  return allExpenses.filter(
    (e) => e.date >= period.startDate && e.date <= period.endDate,
  );
}

import {
  getSettlementPeriod,
  getSettlementYearMonthForDate,
} from "../domain/settlement";

export async function isExpenseSettled(
  ctx: { db: DatabaseReader },
  expenseDate: string,
  groupId: Id<"groups">,
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

  // 精算レコードが存在し、かつstatus="reopened"でない場合は精算済みとみなす
  // "pending"（支払い待ち）や"settled"（完了）は編集不可
  // "reopened"（再オープン）の場合のみ編集・削除が可能
  return (
    existingSettlement !== null && existingSettlement.status !== "reopened"
  );
}

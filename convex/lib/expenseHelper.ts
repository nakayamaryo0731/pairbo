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

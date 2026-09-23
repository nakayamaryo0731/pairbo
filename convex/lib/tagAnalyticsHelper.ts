import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

type TagTotals = Map<Id<"tags">, { amount: number; count: number }>;

type TagBreakdownResult = {
  breakdown: {
    tagId: Id<"tags">;
    tagName: string;
    tagColor: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
  untaggedAmount: number;
};

/**
 * 支出リストからタグ別集計を計算
 */
export async function calculateTagBreakdown(
  ctx: QueryCtx,
  expenses: Doc<"expenses">[],
  totalAmount: number,
): Promise<TagBreakdownResult> {
  if (expenses.length === 0) {
    return { breakdown: [], untaggedAmount: 0 };
  }

  // 支出IDからタグを取得
  const expenseIds = expenses.map((e) => e._id);
  const allExpenseTags = await Promise.all(
    expenseIds.map((expenseId) =>
      ctx.db
        .query("expenseTags")
        .withIndex("by_expense", (q) => q.eq("expenseId", expenseId))
        .collect(),
    ),
  );

  // タグ別に集計
  const tagTotals: TagTotals = new Map();
  let untaggedAmount = 0;

  expenses.forEach((expense, index) => {
    const expenseTags = allExpenseTags[index];
    if (expenseTags.length === 0) {
      untaggedAmount += expense.amount;
    } else {
      // 複数タグがある場合、それぞれのタグに全額を加算
      for (const et of expenseTags) {
        const current = tagTotals.get(et.tagId) ?? { amount: 0, count: 0 };
        tagTotals.set(et.tagId, {
          amount: current.amount + expense.amount,
          count: current.count + 1,
        });
      }
    }
  });

  // タグ情報を取得
  const tagIds = [...tagTotals.keys()];
  const tags = await Promise.all(tagIds.map((id) => ctx.db.get("tags", id)));

  const breakdown = tagIds
    .map((tagId, index) => {
      const tag = tags[index];
      const data = tagTotals.get(tagId) ?? { amount: 0, count: 0 };
      const percentage =
        totalAmount > 0
          ? Math.round((data.amount / totalAmount) * 1000) / 10
          : 0;

      return {
        tagId,
        tagName: tag?.name ?? "不明なタグ",
        tagColor: tag?.color ?? "slate",
        amount: data.amount,
        percentage,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { breakdown, untaggedAmount };
}

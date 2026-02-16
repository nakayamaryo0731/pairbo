import type { DatabaseReader } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type CategoryBreakdownItem = {
  categoryId: Id<"categories">;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
};

/**
 * 支出リストからカテゴリ別の内訳を集計する
 */
export async function buildCategoryBreakdown(
  ctx: { db: DatabaseReader },
  expenses: Doc<"expenses">[],
  totalAmount: number,
): Promise<CategoryBreakdownItem[]> {
  const categoryTotals = new Map<Id<"categories">, number>();
  for (const expense of expenses) {
    const current = categoryTotals.get(expense.categoryId) ?? 0;
    categoryTotals.set(expense.categoryId, current + expense.amount);
  }

  const categoryIds = [...categoryTotals.keys()];
  const categories = await Promise.all(categoryIds.map((id) => ctx.db.get(id)));

  return categoryIds
    .map((categoryId, index) => {
      const category = categories[index];
      const amount = categoryTotals.get(categoryId) ?? 0;
      const percentage =
        totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0;

      return {
        categoryId,
        categoryName: category?.name ?? "不明なカテゴリ",
        categoryIcon: category?.icon ?? "package",
        amount,
        percentage,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

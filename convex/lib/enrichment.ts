import type { DatabaseReader } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * フォールバック値の定数
 */
export const FALLBACK = {
  USER_NAME: "不明なユーザー",
  CATEGORY_NAME: "不明なカテゴリ",
  CATEGORY_ICON: "package",
  GROUP_NAME: "不明なグループ",
} as const;

/**
 * ユーザー情報の型
 */
export interface UserInfo {
  _id: Id<"users">;
  displayName: string;
  avatarUrl?: string;
}

/**
 * カテゴリ情報の型
 */
export interface CategoryInfo {
  _id: Id<"categories">;
  name: string;
  icon: string;
}

/**
 * ユーザー名を取得（フォールバック付き）
 */
export function getUserDisplayName(user: Doc<"users"> | null): string {
  return user?.displayName ?? FALLBACK.USER_NAME;
}

/**
 * ユーザー情報を取得（nullの場合はnull）
 */
export function getUserInfo(user: Doc<"users"> | null): UserInfo | null {
  if (!user) return null;
  return {
    _id: user._id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * カテゴリ情報を取得（nullの場合はnull）
 */
export function getCategoryInfo(
  category: Doc<"categories"> | null,
): CategoryInfo | null {
  if (!category) return null;
  return {
    _id: category._id,
    name: category.name,
    icon: category.icon,
  };
}

/**
 * ユーザー情報のMapを作成
 *
 * @param ctx - データベースコンテキスト
 * @param userIds - ユーザーID配列
 * @returns ユーザーIDをキーとしたUserInfoのMap
 */
export async function createUserMap(
  ctx: { db: DatabaseReader },
  userIds: Id<"users">[],
): Promise<Map<Id<"users">, UserInfo>> {
  const uniqueIds = [...new Set(userIds)];
  const users = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

  const map = new Map<Id<"users">, UserInfo>();
  for (const user of users) {
    if (user) {
      map.set(user._id, {
        _id: user._id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    }
  }
  return map;
}

/**
 * カテゴリ情報のMapを作成
 *
 * @param ctx - データベースコンテキスト
 * @param categoryIds - カテゴリID配列
 * @returns カテゴリIDをキーとしたCategoryInfoのMap
 */
export async function createCategoryMap(
  ctx: { db: DatabaseReader },
  categoryIds: Id<"categories">[],
): Promise<Map<Id<"categories">, CategoryInfo>> {
  const uniqueIds = [...new Set(categoryIds)];
  const categories = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));

  const map = new Map<Id<"categories">, CategoryInfo>();
  for (const category of categories) {
    if (category) {
      map.set(category._id, {
        _id: category._id,
        name: category.name,
        icon: category.icon,
      });
    }
  }
  return map;
}

/**
 * 既存のユーザーMapに追加のユーザーを追加
 *
 * @param ctx - データベースコンテキスト
 * @param userMap - 既存のユーザーMap
 * @param userIds - 追加するユーザーID配列
 */
export async function extendUserMap(
  ctx: { db: DatabaseReader },
  userMap: Map<Id<"users">, UserInfo>,
  userIds: Id<"users">[],
): Promise<void> {
  const newIds = userIds.filter((id) => !userMap.has(id));
  if (newIds.length === 0) return;

  const uniqueNewIds = [...new Set(newIds)];
  const users = await Promise.all(uniqueNewIds.map((id) => ctx.db.get(id)));

  for (const user of users) {
    if (user) {
      userMap.set(user._id, {
        _id: user._id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    }
  }
}

/**
 * エンリッチされた支出アイテムの型
 */
export interface EnrichedExpenseItem {
  _id: Id<"expenses">;
  amount: number;
  date: string;
  title?: string;
  memo?: string;
  splitMethod: string;
  category: CategoryInfo | null;
  payer: UserInfo | null;
  splits: {
    userId: Id<"users">;
    displayName: string;
    amount: number;
  }[];
  createdAt: number;
}

/**
 * 支出リストをエンリッチ（ユーザー・カテゴリ情報を付加）
 *
 * @param ctx - データベースコンテキスト
 * @param expenses - 支出ドキュメント配列
 * @returns エンリッチされた支出アイテム配列
 */
export async function enrichExpenseList(
  ctx: { db: DatabaseReader },
  expenses: Doc<"expenses">[],
): Promise<EnrichedExpenseItem[]> {
  if (expenses.length === 0) {
    return [];
  }

  const categoryIds = expenses.map((e) => e.categoryId);
  const payerIds = expenses.map((e) => e.paidBy);

  const [categoryMap, userMap] = await Promise.all([
    createCategoryMap(ctx, categoryIds),
    createUserMap(ctx, payerIds),
  ]);

  const allSplits = await Promise.all(
    expenses.map((expense) =>
      ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect(),
    ),
  );

  const splitUserIds = allSplits.flat().map((s) => s.userId);
  await extendUserMap(ctx, userMap, splitUserIds);

  return expenses.map((expense, index) => {
    const category = categoryMap.get(expense.categoryId);
    const payer = userMap.get(expense.paidBy);
    const splits = allSplits[index];

    return {
      _id: expense._id,
      amount: expense.amount,
      date: expense.date,
      title: expense.title,
      memo: expense.memo,
      splitMethod: expense.splitMethod,
      category: category ?? null,
      payer: payer ?? null,
      splits: splits.map((split) => {
        const user = userMap.get(split.userId);
        return {
          userId: split.userId,
          displayName: user?.displayName ?? FALLBACK.USER_NAME,
          amount: split.amount,
        };
      }),
      createdAt: expense.createdAt,
    };
  });
}

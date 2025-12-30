import { v } from "convex/values";
import { internalMutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { PRESET_CATEGORIES } from "./lib/presetCategories";
import {
  SEED_USERS,
  TEST_GROUP,
  SAMPLE_EXPENSES,
  SAMPLE_SHOPPING_ITEMS,
  SAMPLE_SETTLEMENTS,
  RATIO_SPLIT,
  SEED_PREFIX,
  generateRandomDate,
  getSettlementPeriodForSeed,
} from "./lib/seedData";

/**
 * シードデータ投入
 *
 * 既存のシードデータがあれば削除して再作成する
 *
 * 実行: npx convex run seed:seedTestData
 */
export const seedTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    await clearSeedDataInternal(ctx);

    const now = Date.now();

    const userIds: Id<"users">[] = [];
    for (const seedUser of SEED_USERS) {
      const userId = await ctx.db.insert("users", {
        clerkId: seedUser.clerkId,
        displayName: seedUser.displayName,
        avatarUrl: seedUser.avatarUrl,
        createdAt: now,
        updatedAt: now,
      });
      userIds.push(userId);
    }

    const groupId = await ctx.db.insert("groups", {
      name: TEST_GROUP.name,
      description: TEST_GROUP.description,
      closingDay: TEST_GROUP.closingDay,
      createdAt: now,
      updatedAt: now,
    });

    const categoryMap = new Map<string, Id<"categories">>();
    for (const preset of PRESET_CATEGORIES) {
      const categoryId = await ctx.db.insert("categories", {
        groupId,
        name: preset.name,
        icon: preset.icon,
        isPreset: true,
        sortOrder: preset.sortOrder,
        createdAt: now,
      });
      categoryMap.set(preset.name, categoryId);
    }

    for (let i = 0; i < userIds.length; i++) {
      await ctx.db.insert("groupMembers", {
        groupId,
        userId: userIds[i],
        role: i === 0 ? "owner" : "member",
        joinedAt: now,
      });
    }

    for (const expense of SAMPLE_EXPENSES) {
      const categoryId = categoryMap.get(expense.categoryName);
      if (!categoryId) continue;

      const paidByUserId = userIds[expense.paidByIndex];
      const expenseId = await ctx.db.insert("expenses", {
        groupId,
        amount: expense.amount,
        categoryId,
        paidBy: paidByUserId,
        date: generateRandomDate(),
        memo: expense.memo,
        splitMethod: expense.splitMethod,
        createdBy: paidByUserId,
        createdAt: now,
        updatedAt: now,
      });

      await createExpenseSplits(
        ctx,
        expenseId,
        expense.amount,
        expense.splitMethod,
        userIds,
        paidByUserId,
      );
    }

    for (const item of SAMPLE_SHOPPING_ITEMS) {
      await ctx.db.insert("shoppingItems", {
        groupId,
        name: item.name,
        addedBy: userIds[0],
        purchasedAt: undefined,
        purchasedBy: undefined,
        linkedExpenseId: undefined,
        createdAt: now,
      });
    }

    let settlementCount = 0;
    for (const settlement of SAMPLE_SETTLEMENTS) {
      const period = getSettlementPeriodForSeed(
        TEST_GROUP.closingDay,
        settlement.yearOffset,
        settlement.monthOffset,
      );

      const settlementId = await ctx.db.insert("settlements", {
        groupId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        status: settlement.status,
        settledAt: settlement.status === "settled" ? now : undefined,
        createdBy: userIds[0],
        createdAt: now,
      });

      for (const payment of settlement.payments) {
        await ctx.db.insert("settlementPayments", {
          settlementId,
          fromUserId: userIds[payment.fromUserIndex],
          toUserId: userIds[payment.toUserIndex],
          amount: payment.amount,
          isPaid: payment.isPaid,
          paidAt: payment.isPaid ? now : undefined,
        });
      }

      settlementCount++;
    }

    return {
      success: true,
      message: "シードデータを作成しました",
      groupId,
      userCount: userIds.length,
      expenseCount: SAMPLE_EXPENSES.length,
      shoppingItemCount: SAMPLE_SHOPPING_ITEMS.length,
      settlementCount,
    };
  },
});

/**
 * シードデータ削除
 *
 * 実行: npx convex run seed:clearTestData
 */
export const clearTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const deletedCounts = await clearSeedDataInternal(ctx);
    return {
      success: true,
      message: "シードデータを削除しました",
      ...deletedCounts,
    };
  },
});

/**
 * ユーザーをテストグループに追加
 *
 * 実行: npx convex run seed:joinTestGroup '{"userId": "j57..."}'
 */
export const joinTestGroup = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { success: false, message: "ユーザーが見つかりません" };
    }

    const groups = await ctx.db.query("groups").collect();
    const testGroup = groups.find((g) => g.name === TEST_GROUP.name);
    if (!testGroup) {
      return {
        success: false,
        message:
          "テストグループが見つかりません。先に seedTestData を実行してください",
      };
    }

    const existingMembership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", testGroup._id).eq("userId", args.userId),
      )
      .unique();

    if (existingMembership) {
      return { success: false, message: "既にテストグループのメンバーです" };
    }

    await ctx.db.insert("groupMembers", {
      groupId: testGroup._id,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return {
      success: true,
      message: "テストグループに参加しました",
      groupId: testGroup._id,
    };
  },
});

/**
 * テストグループのオーナーを変更
 *
 * 実行: npx convex run seed:makeOwner '{"userId": "j57..."}'
 */
export const makeOwner = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const groups = await ctx.db.query("groups").collect();
    const testGroup = groups.find((g) => g.name === TEST_GROUP.name);
    if (!testGroup) {
      return {
        success: false,
        message: "テストグループが見つかりません",
      };
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", testGroup._id).eq("userId", args.userId),
      )
      .unique();

    if (!membership) {
      return {
        success: false,
        message: "ユーザーがテストグループのメンバーではありません",
      };
    }

    await ctx.db.patch(membership._id, { role: "owner" });

    return {
      success: true,
      message: "オーナーに変更しました",
    };
  },
});

/**
 * シードデータを削除する内部関数
 */
async function clearSeedDataInternal(ctx: MutationCtx) {
  let deletedUsers = 0;
  let deletedGroups = 0;
  let deletedMembers = 0;
  let deletedCategories = 0;
  let deletedExpenses = 0;
  let deletedSplits = 0;
  let deletedShoppingItems = 0;
  let deletedSettlements = 0;
  let deletedSettlementPayments = 0;

  const allUsers = await ctx.db.query("users").collect();
  const seedUsers = allUsers.filter((u) => u.clerkId.startsWith(SEED_PREFIX));

  if (seedUsers.length === 0) {
    return {
      deletedUsers,
      deletedGroups,
      deletedMembers,
      deletedCategories,
      deletedExpenses,
      deletedSplits,
      deletedShoppingItems,
      deletedSettlements,
      deletedSettlementPayments,
    };
  }

  const allGroups = await ctx.db.query("groups").collect();
  const testGroups = allGroups.filter((g) => g.name === TEST_GROUP.name);

  for (const group of testGroups) {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", group._id))
      .collect();

    for (const expense of expenses) {
      const splits = await ctx.db
        .query("expenseSplits")
        .withIndex("by_expense", (q) => q.eq("expenseId", expense._id))
        .collect();
      for (const split of splits) {
        await ctx.db.delete(split._id);
        deletedSplits++;
      }
      await ctx.db.delete(expense._id);
      deletedExpenses++;
    }

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    for (const category of categories) {
      await ctx.db.delete(category._id);
      deletedCategories++;
    }

    const shoppingItems = await ctx.db
      .query("shoppingItems")
      .withIndex("by_group_and_purchased", (q) => q.eq("groupId", group._id))
      .collect();
    for (const item of shoppingItems) {
      await ctx.db.delete(item._id);
      deletedShoppingItems++;
    }

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group_and_period", (q) => q.eq("groupId", group._id))
      .collect();
    for (const settlement of settlements) {
      const payments = await ctx.db
        .query("settlementPayments")
        .withIndex("by_settlement", (q) => q.eq("settlementId", settlement._id))
        .collect();
      for (const payment of payments) {
        await ctx.db.delete(payment._id);
        deletedSettlementPayments++;
      }
      await ctx.db.delete(settlement._id);
      deletedSettlements++;
    }

    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", group._id))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
      deletedMembers++;
    }

    await ctx.db.delete(group._id);
    deletedGroups++;
  }

  for (const user of seedUsers) {
    await ctx.db.delete(user._id);
    deletedUsers++;
  }

  return {
    deletedUsers,
    deletedGroups,
    deletedMembers,
    deletedCategories,
    deletedExpenses,
    deletedSplits,
    deletedShoppingItems,
    deletedSettlements,
    deletedSettlementPayments,
  };
}

/**
 * 支出分割データを作成
 */
async function createExpenseSplits(
  ctx: MutationCtx,
  expenseId: Id<"expenses">,
  amount: number,
  splitMethod: "equal" | "ratio" | "full",
  userIds: Id<"users">[],
  paidByUserId: Id<"users">,
) {
  switch (splitMethod) {
    case "equal": {
      // 均等分割（端数は最初のユーザーに）
      const baseAmount = Math.floor(amount / userIds.length);
      const remainder = amount - baseAmount * userIds.length;

      for (let i = 0; i < userIds.length; i++) {
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId: userIds[i],
          amount: baseAmount + (i === 0 ? remainder : 0),
        });
      }
      break;
    }

    case "ratio": {
      // 60:40 固定割合
      const amount1 = Math.floor((amount * RATIO_SPLIT.partner1) / 100);
      const amount2 = amount - amount1;

      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: userIds[0],
        amount: amount1,
      });
      await ctx.db.insert("expenseSplits", {
        expenseId,
        userId: userIds[1],
        amount: amount2,
      });
      break;
    }

    case "full": {
      // 支払者が全額負担
      for (const userId of userIds) {
        await ctx.db.insert("expenseSplits", {
          expenseId,
          userId,
          amount: userId === paidByUserId ? amount : 0,
        });
      }
      break;
    }
  }
}

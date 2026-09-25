import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

const userAIdentity = {
  subject: "test_user_a",
  name: "ユーザーA",
  email: "user_a@example.com",
};

const userBIdentity = {
  subject: "test_user_b",
  name: "ユーザーB",
  email: "user_b@example.com",
};

describe("analytics", () => {
  describe("getCategoryBreakdown", () => {
    test("カテゴリ別の支出を集計できる", async () => {
      const t = convexTest(schema, modules);

      // グループ作成
      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const category1 = detail.categories[0]; // 食費
      const category2 = detail.categories[1]; // 日用品
      const payerId = detail.members[0].userId;

      // 支出を登録（締め日25日なので、12/26〜1/25が1月分）
      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1000,
        categoryId: category1._id,
        paidBy: payerId,
        date: "2024-12-26", // 1月分の期間内
      });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 2000,
        categoryId: category1._id,
        paidBy: payerId,
        date: "2025-01-05", // 1月分の期間内
      });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1500,
        categoryId: category2._id,
        paidBy: payerId,
        date: "2025-01-10", // 1月分の期間内
      });

      // 集計を取得
      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getCategoryBreakdown, {
          groupId,
          year: 2025,
          month: 1,
        });

      expect(result.totalAmount).toBe(4500);
      expect(result.breakdown).toHaveLength(2);

      // 金額降順でソートされている
      expect(result.breakdown[0].amount).toBe(3000);
      expect(result.breakdown[0].categoryName).toBe(category1.name);
      expect(result.breakdown[1].amount).toBe(1500);
      expect(result.breakdown[1].categoryName).toBe(category2.name);

      // パーセンテージが正しい
      expect(result.breakdown[0].percentage).toBeCloseTo(66.7, 1);
      expect(result.breakdown[1].percentage).toBeCloseTo(33.3, 1);
    });

    test("支出がない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getCategoryBreakdown, {
          groupId,
          year: 2025,
          month: 1,
        });

      expect(result.totalAmount).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    test("非メンバーはアクセスできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // ユーザーBを作成（別のグループを作成することでユーザー作成）
      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "ユーザーBのグループ",
      });

      await expect(
        t
          .withIdentity(userBIdentity)
          .query(api.analytics.getCategoryBreakdown, {
            groupId,
            year: 2025,
            month: 1,
          }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("getMonthlyTrend", () => {
    test("月別の支出推移を取得できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      // 各月に支出を登録（締め日は25日なので、12/26〜1/25が1月分）
      // 1月分（12/26〜1/25）
      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1000,
        categoryId,
        paidBy: payerId,
        date: "2024-12-28",
      });

      // 2月分（1/26〜2/25）
      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 2000,
        categoryId,
        paidBy: payerId,
        date: "2025-01-28",
      });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getMonthlyTrend, {
          groupId,
          year: 2025,
          month: 2,
          months: 3,
        });

      expect(result.trend).toHaveLength(3);

      // 最新月がisCurrentになる
      const currentMonth = result.trend.find((t) => t.isCurrent);
      expect(currentMonth).toBeDefined();
      expect(currentMonth?.year).toBe(2025);
      expect(currentMonth?.month).toBe(2);
    });

    test("支出がない月はamount=0で返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getMonthlyTrend, {
          groupId,
          year: 2025,
          month: 1,
          months: 6,
        });

      expect(result.trend).toHaveLength(6);
      expect(result.trend.every((t) => t.amount === 0)).toBe(true);
    });

    test("取得範囲の境界日の支出が正しく集計される", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      // 締め日25日・2025年2月から3ヶ月分 → 範囲は 2024-11-26 〜 2025-02-25
      const expenseDates = [
        { date: "2024-11-25", amount: 1 }, // 範囲外（前日）
        { date: "2024-11-26", amount: 10 }, // 最古期間の開始日
        { date: "2025-02-25", amount: 100 }, // 最新期間の終了日
        { date: "2025-02-26", amount: 1000 }, // 範囲外（翌日）
      ];
      for (const { date, amount } of expenseDates) {
        await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount,
          categoryId,
          paidBy: payerId,
          date,
        });
      }

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getMonthlyTrend, {
          groupId,
          year: 2025,
          month: 2,
          months: 3,
        });

      expect(result.trend).toHaveLength(3);
      expect(result.trend[0].amount).toBe(10); // 2024年12月分
      expect(result.trend[1].amount).toBe(0); // 2025年1月分
      expect(result.trend[2].amount).toBe(100); // 2025年2月分
    });

    test("非メンバーはアクセスできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // ユーザーBを作成（別のグループを作成することでユーザー作成）
      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "ユーザーBのグループ",
      });

      await expect(
        t.withIdentity(userBIdentity).query(api.analytics.getMonthlyTrend, {
          groupId,
          year: 2025,
          month: 1,
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("getYearlyCategoryBreakdown", () => {
    test("年の境界日の支出が正しく集計される", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      // Premiumサブスクリプションを設定（年次分析はPremium機能）
      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("subscriptions", {
          userId: payerId,
          stripeCustomerId: "cus_test",
          stripeSubscriptionId: "sub_test",
          plan: "premium",
          status: "active",
          currentPeriodStart: now - 30 * 24 * 60 * 60 * 1000,
          currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        });
      });

      const expenseDates = [
        { date: "2024-12-31", amount: 1 }, // 範囲外（前年末）
        { date: "2025-01-01", amount: 10 }, // 年初
        { date: "2025-12-31", amount: 100 }, // 年末
        { date: "2026-01-01", amount: 1000 }, // 範囲外（翌年初）
      ];
      for (const { date, amount } of expenseDates) {
        await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount,
          categoryId,
          paidBy: payerId,
          date,
        });
      }

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getYearlyCategoryBreakdown, {
          groupId,
          year: 2025,
        });

      expect(result.totalAmount).toBe(110);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].amount).toBe(110);
    });
  });

  describe("getAllTimeCategoryBreakdown", () => {
    test("Premiumユーザーは全期間のカテゴリ別支出を集計できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const category1 = detail.categories[0];
      const category2 = detail.categories[1];
      const payerId = detail.members[0].userId;

      // Premiumサブスクリプションを設定
      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("subscriptions", {
          userId: payerId,
          stripeCustomerId: "cus_test",
          stripeSubscriptionId: "sub_test",
          plan: "premium",
          status: "active",
          currentPeriodStart: now - 30 * 24 * 60 * 60 * 1000,
          currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        });
      });

      // 複数年に跨る支出を登録
      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1000,
        categoryId: category1._id,
        paidBy: payerId,
        date: "2023-06-15",
      });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 2000,
        categoryId: category1._id,
        paidBy: payerId,
        date: "2024-03-10",
      });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1500,
        categoryId: category2._id,
        paidBy: payerId,
        date: "2025-01-05",
      });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getAllTimeCategoryBreakdown, {
          groupId,
        });

      expect(result.totalAmount).toBe(4500);
      expect(result.breakdown).toHaveLength(2);
      expect(result.periodLabel).toBe("2023-06-15 〜 2025-01-05");

      // 金額降順でソートされている
      expect(result.breakdown[0].amount).toBe(3000);
      expect(result.breakdown[1].amount).toBe(1500);
    });

    test("Freeユーザーは空の結果を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const payerId = detail.members[0].userId;
      const categoryId = detail.categories[0]._id;

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1000,
        categoryId,
        paidBy: payerId,
        date: "2024-01-01",
      });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getAllTimeCategoryBreakdown, {
          groupId,
        });

      expect(result.totalAmount).toBe(0);
      expect(result.breakdown).toHaveLength(0);
      expect(result.periodLabel).toBeNull();
    });

    test("Premiumユーザーで支出がない場合はnullのperiodLabelを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const now = Date.now();
      await t.run(async (ctx) => {
        await ctx.db.insert("subscriptions", {
          userId: detail.members[0].userId,
          stripeCustomerId: "cus_test",
          stripeSubscriptionId: "sub_test",
          plan: "premium",
          status: "active",
          currentPeriodStart: now - 30 * 24 * 60 * 60 * 1000,
          currentPeriodEnd: now + 30 * 24 * 60 * 60 * 1000,
          cancelAtPeriodEnd: false,
          createdAt: now,
          updatedAt: now,
        });
      });

      const result = await t
        .withIdentity(userAIdentity)
        .query(api.analytics.getAllTimeCategoryBreakdown, {
          groupId,
        });

      expect(result.totalAmount).toBe(0);
      expect(result.breakdown).toHaveLength(0);
      expect(result.periodLabel).toBeNull();
    });

    test("非メンバーはアクセスできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "ユーザーBのグループ",
      });

      await expect(
        t
          .withIdentity(userBIdentity)
          .query(api.analytics.getAllTimeCategoryBreakdown, {
            groupId,
          }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });
});

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

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
});

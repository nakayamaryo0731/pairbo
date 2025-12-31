import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

// テスト用のユーザー認証情報
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

const userCIdentity = {
  subject: "test_user_c",
  name: "ユーザーC",
  email: "user_c@example.com",
};

describe("expenses", () => {
  describe("create", () => {
    test("支出を登録できる", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
          memo: "テストメモ",
        });

      expect(expenseId).toBeDefined();

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.amount).toBe(1000);
      expect(expense.date).toBe("2024-12-30");
      expect(expense.memo).toBe("テストメモ");
      expect(expense.splitMethod).toBe("equal");
    });

    test("均等分割が正しく計算される（2人）", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(userBIdentity)
        .mutation(api.invitations.accept, { token });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerA = detail.members.find(
        (m) => m.displayName === "ユーザーA",
      )!.userId;

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerA,
          date: "2024-12-30",
        });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      // 1000 ÷ 2 = 500
      expect(expense.splits.length).toBe(2);
      expect(expense.splits.every((s) => s.amount === 500)).toBe(true);
    });

    test("均等分割で端数は支払者が負担する（3人）", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token: tokenB } = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(userBIdentity)
        .mutation(api.invitations.accept, { token: tokenB });

      const { token: tokenC } = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(userCIdentity)
        .mutation(api.invitations.accept, { token: tokenC });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerA = detail.members.find(
        (m) => m.displayName === "ユーザーA",
      )!.userId;

      // 1000 ÷ 3 = 333余り1
      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerA,
          date: "2024-12-30",
        });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.splits.length).toBe(3);

      const payerSplit = expense.splits.find((s) => s.userId === payerA);
      const otherSplits = expense.splits.filter((s) => s.userId !== payerA);

      expect(payerSplit?.amount).toBe(334);
      expect(otherSplits.every((s) => s.amount === 333)).toBe(true);

      const total = expense.splits.reduce((sum, s) => sum + s.amount, 0);
      expect(total).toBe(1000);
    });

    test("金額が0以下の場合はエラー", async () => {
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

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount: 0,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        }),
      ).rejects.toThrow("金額は1円から1億円の範囲で入力してください");
    });

    test("金額が1億円を超える場合はエラー", async () => {
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

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount: 100_000_001,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        }),
      ).rejects.toThrow("金額は1円から1億円の範囲で入力してください");
    });

    test("未来日の場合はエラー", async () => {
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

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2099-12-31",
        }),
      ).rejects.toThrow("未来の日付は指定できません");
    });

    test("メモが500文字を超える場合はエラー", async () => {
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

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
          memo: "あ".repeat(501),
        }),
      ).rejects.toThrow("メモは500文字以内で入力してください");
    });

    test("グループメンバーでない場合はエラー", async () => {
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

      await expect(
        t.withIdentity(userBIdentity).mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("listByGroup", () => {
    test("グループの支出一覧を取得できる", async () => {
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

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 1000,
        categoryId,
        paidBy: payerId,
        date: "2024-12-29",
      });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 2000,
        categoryId,
        paidBy: payerId,
        date: "2024-12-30",
      });

      const expenses = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.listByGroup, { groupId });

      expect(expenses.length).toBe(2);
      expect(expenses[0].date).toBe("2024-12-30");
      expect(expenses[1].date).toBe("2024-12-29");
    });

    test("limitを指定すると件数を制限できる", async () => {
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

      for (let i = 1; i <= 3; i++) {
        await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
          groupId,
          amount: i * 1000,
          categoryId,
          paidBy: payerId,
          date: `2024-12-${28 + i}`,
        });
      }

      const expenses = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.listByGroup, { groupId, limit: 2 });

      expect(expenses.length).toBe(2);
    });

    test("グループメンバーでない場合はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "別のグループ",
      });

      await expect(
        t
          .withIdentity(userBIdentity)
          .query(api.expenses.listByGroup, { groupId }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("getById", () => {
    test("支出詳細を取得できる", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1500,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
          memo: "詳細テスト",
        });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense._id).toBe(expenseId);
      expect(expense.amount).toBe(1500);
      expect(expense.memo).toBe("詳細テスト");
      expect(expense.category).not.toBeNull();
      expect(expense.payer).not.toBeNull();
      expect(expense.splits.length).toBe(1);
      expect(expense.createdBy).not.toBeNull();
    });

    test("グループメンバーでない場合はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "別のグループ",
      });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      await expect(
        t
          .withIdentity(userBIdentity)
          .query(api.expenses.getById, { expenseId }),
      ).rejects.toThrow("この支出にアクセスする権限がありません");
    });

    test("isSettledフラグが返される", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      // 未精算の状態ではfalse
      expect(expense.isSettled).toBe(false);
    });
  });

  describe("update", () => {
    test("支出を更新できる", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
          memo: "元のメモ",
        });

      await t.withIdentity(userAIdentity).mutation(api.expenses.update, {
        expenseId,
        amount: 2000,
        categoryId,
        paidBy: payerId,
        date: "2024-12-29",
        memo: "更新後のメモ",
      });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.amount).toBe(2000);
      expect(expense.date).toBe("2024-12-29");
      expect(expense.memo).toBe("更新後のメモ");
    });

    test("分割方法を変更できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(userBIdentity)
        .mutation(api.invitations.accept, { token });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const userA = detail.members.find(
        (m) => m.displayName === "ユーザーA",
      )!.userId;
      const userB = detail.members.find(
        (m) => m.displayName === "ユーザーB",
      )!.userId;

      // 最初は均等分割
      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: userA,
          date: "2024-12-30",
        });

      // 割合指定に変更
      await t.withIdentity(userAIdentity).mutation(api.expenses.update, {
        expenseId,
        amount: 1000,
        categoryId,
        paidBy: userA,
        date: "2024-12-30",
        splitDetails: {
          method: "ratio",
          ratios: [
            { userId: userA, ratio: 70 },
            { userId: userB, ratio: 30 },
          ],
        },
      });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.splitMethod).toBe("ratio");
      const splitA = expense.splits.find((s) => s.userId === userA);
      const splitB = expense.splits.find((s) => s.userId === userB);
      expect(splitA?.amount).toBe(700);
      expect(splitB?.amount).toBe(300);
    });

    test("グループメンバーでない場合はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "別のグループ",
      });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      await expect(
        t.withIdentity(userBIdentity).mutation(api.expenses.update, {
          expenseId,
          amount: 2000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });

    test("無効な金額でエラー", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.update, {
          expenseId,
          amount: 0,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        }),
      ).rejects.toThrow("金額は1円から1億円の範囲で入力してください");
    });
  });

  describe("remove", () => {
    test("支出を削除できる", async () => {
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

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      await t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
        expenseId,
      });

      await expect(
        t
          .withIdentity(userAIdentity)
          .query(api.expenses.getById, { expenseId }),
      ).rejects.toThrow("支出が見つかりません");
    });

    test("支出一覧から削除した支出が消える", async () => {
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

      const expenseId1 = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-29",
        });

      await t.withIdentity(userAIdentity).mutation(api.expenses.create, {
        groupId,
        amount: 2000,
        categoryId,
        paidBy: payerId,
        date: "2024-12-30",
      });

      let expenses = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.listByGroup, { groupId });

      expect(expenses.length).toBe(2);

      await t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
        expenseId: expenseId1,
      });

      expenses = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.listByGroup, { groupId });

      expect(expenses.length).toBe(1);
      expect(expenses[0].amount).toBe(2000);
    });

    test("グループメンバーでない場合はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(userAIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "別のグループ",
      });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      const categoryId = detail.categories[0]._id;
      const payerId = detail.members[0].userId;

      const expenseId = await t
        .withIdentity(userAIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId,
          paidBy: payerId,
          date: "2024-12-30",
        });

      await expect(
        t.withIdentity(userBIdentity).mutation(api.expenses.remove, {
          expenseId,
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });
});

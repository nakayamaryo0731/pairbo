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

/**
 * テスト用のグループ作成ヘルパー
 */
async function createGroupWithMembers(
  t: ReturnType<typeof convexTest>,
  memberIdentities: (typeof userAIdentity)[],
) {
  const groupId = await t
    .withIdentity(userAIdentity)
    .mutation(api.groups.create, {
      name: "テストグループ",
    });

  for (const identity of memberIdentities.slice(1)) {
    const { token } = await t
      .withIdentity(userAIdentity)
      .mutation(api.groups.createInvitation, { groupId });
    await t.withIdentity(identity).mutation(api.invitations.accept, { token });
  }

  return groupId;
}

/**
 * テスト用の支出作成ヘルパー
 */
async function createExpense(
  t: ReturnType<typeof convexTest>,
  identity: typeof userAIdentity,
  groupId: Awaited<ReturnType<typeof createGroupWithMembers>>,
  amount: number,
  date: string,
) {
  const detail = await t.withIdentity(identity).query(api.groups.getDetail, {
    groupId,
  });
  const categoryId = detail.categories[0]._id;
  const payerId = detail.members.find((m) => m.isMe)?.userId;

  if (!payerId) throw new Error("Payer not found");

  return t.withIdentity(identity).mutation(api.expenses.create, {
    groupId,
    amount,
    categoryId,
    paidBy: payerId,
    date,
  });
}

describe("精算確定後の支出制限", () => {
  describe("update", () => {
    test("精算済み期間の支出は編集できない", async () => {
      const t = convexTest(schema, modules);

      // グループ作成
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 支出作成（2024年12月期間内）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );

      // 精算確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 編集を試みる → エラー
      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.update, {
          expenseId,
          amount: 2000,
          categoryId: detail.categories[0]._id,
          paidBy: detail.members[0].userId,
          date: "2024-12-01",
        }),
      ).rejects.toThrow("精算済みの期間の支出は編集できません");
    });

    test("未精算期間の支出は編集できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 2024年12月の精算を確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 2025年1月の支出を作成（未精算期間）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2025-01-15",
      );

      // 編集できる
      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      await t.withIdentity(userAIdentity).mutation(api.expenses.update, {
        expenseId,
        amount: 2000,
        categoryId: detail.categories[0]._id,
        paidBy: detail.members[0].userId,
        date: "2025-01-15",
      });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.amount).toBe(2000);
    });
  });

  describe("remove", () => {
    test("精算済み期間の支出は削除できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 支出作成
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );

      // 精算確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 削除を試みる → エラー
      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
          expenseId,
        }),
      ).rejects.toThrow("精算済みの期間の支出は削除できません");
    });

    test("未精算期間の支出は削除できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 2024年12月の精算を確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 2025年1月の支出を作成（未精算期間）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2025-01-15",
      );

      // 削除できる
      await t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
        expenseId,
      });

      // 削除されたことを確認
      await expect(
        t.withIdentity(userAIdentity).query(api.expenses.getById, {
          expenseId,
        }),
      ).rejects.toThrow("支出が見つかりません");
    });
  });

  describe("isSettled フラグ", () => {
    test("精算済み支出の isSettled が true になる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 支出作成
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );

      // 精算前は isSettled = false
      const beforeSettlement = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });
      expect(beforeSettlement.isSettled).toBe(false);

      // 精算確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 精算後は isSettled = true
      const afterSettlement = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });
      expect(afterSettlement.isSettled).toBe(true);
    });
  });

  describe("reopen後の支出操作", () => {
    test("reopen後の支出は削除できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 両ユーザーから同額の支出を作成（支払いが相殺されてstatus="settled"になる）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );
      await createExpense(t, userBIdentity, groupId, 1000, "2024-12-02");

      // 精算確定（支払いが相殺されるのでstatus="settled"で作成される）
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      // 削除できないことを確認
      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
          expenseId,
        }),
      ).rejects.toThrow("精算済みの期間の支出は削除できません");

      // 精算をreopen
      await t.withIdentity(userAIdentity).mutation(api.settlements.reopen, {
        settlementId,
      });

      // reopen後は削除できる
      await t.withIdentity(userAIdentity).mutation(api.expenses.remove, {
        expenseId,
      });

      // 削除されたことを確認
      await expect(
        t.withIdentity(userAIdentity).query(api.expenses.getById, {
          expenseId,
        }),
      ).rejects.toThrow("支出が見つかりません");
    });

    test("reopen後の支出は編集できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 両ユーザーから同額の支出を作成
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );
      await createExpense(t, userBIdentity, groupId, 1000, "2024-12-02");

      // 精算確定
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      // 精算をreopen
      await t.withIdentity(userAIdentity).mutation(api.settlements.reopen, {
        settlementId,
      });

      // reopen後は編集できる
      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      await t.withIdentity(userAIdentity).mutation(api.expenses.update, {
        expenseId,
        amount: 2000,
        categoryId: detail.categories[0]._id,
        paidBy: detail.members[0].userId,
        date: "2024-12-01",
      });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.amount).toBe(2000);
    });

    test("reopen後の支出のisSettledがfalseになる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 両ユーザーから同額の支出を作成
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2024-12-01",
      );
      await createExpense(t, userBIdentity, groupId, 1000, "2024-12-02");

      // 精算確定
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      // 精算後は isSettled = true
      const afterSettlement = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });
      expect(afterSettlement.isSettled).toBe(true);

      // 精算をreopen
      await t.withIdentity(userAIdentity).mutation(api.settlements.reopen, {
        settlementId,
      });

      // reopen後は isSettled = false
      const afterReopen = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });
      expect(afterReopen.isSettled).toBe(false);
    });
  });

  describe("日付変更と精算済み期間", () => {
    test("未精算期間から精算済み期間への日付変更はできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 2024年12月の精算を確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 2025年1月の支出を作成（未精算期間）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2025-01-15",
      );

      // 日付を2024年12月（精算済み期間）に変更 → エラー
      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      await expect(
        t.withIdentity(userAIdentity).mutation(api.expenses.update, {
          expenseId,
          amount: 1000,
          categoryId: detail.categories[0]._id,
          paidBy: detail.members[0].userId,
          date: "2024-12-15", // 精算済み期間への変更
        }),
      ).rejects.toThrow("精算済みの期間への日付変更はできません");
    });

    test("未精算期間内での日付変更は可能", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // 2024年12月の精算を確定
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 2025年1月の支出を作成（未精算期間）
      const expenseId = await createExpense(
        t,
        userAIdentity,
        groupId,
        1000,
        "2025-01-15",
      );

      // 同じ未精算期間内での日付変更 → OK
      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.groups.getDetail, { groupId });

      await t.withIdentity(userAIdentity).mutation(api.expenses.update, {
        expenseId,
        amount: 1000,
        categoryId: detail.categories[0]._id,
        paidBy: detail.members[0].userId,
        date: "2025-01-20", // 同じ未精算期間
      });

      const expense = await t
        .withIdentity(userAIdentity)
        .query(api.expenses.getById, { expenseId });

      expect(expense.date).toBe("2025-01-20");
    });
  });
});

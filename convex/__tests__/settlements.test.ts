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
  groupId: ReturnType<typeof createGroupWithMembers>,
  amount: number,
  date: string,
) {
  const groupIdResolved = await groupId;
  const detail = await t.withIdentity(identity).query(api.groups.getDetail, {
    groupId: groupIdResolved,
  });
  const categoryId = detail.categories[0]._id;
  const payerId = detail.members.find((m) => m.isMe)?.userId;

  if (!payerId) throw new Error("Payer not found");

  return t.withIdentity(identity).mutation(api.expenses.create, {
    groupId: groupIdResolved,
    amount,
    categoryId,
    paidBy: payerId,
    date,
  });
}

describe("settlements", () => {
  describe("getPreview", () => {
    test("支出なしの場合、精算額ゼロ", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, {
          groupId,
          year: 2024,
          month: 12,
        });

      expect(preview.balances).toHaveLength(2);
      expect(preview.payments).toHaveLength(0);
      expect(preview.totalExpenses).toBe(0);
      expect(preview.totalAmount).toBe(0);
      expect(preview.existingSettlementId).toBeNull();
    });

    test("支出ありの場合、正しい精算額", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // ユーザーAが1000円支出（期間内）
      await createExpense(
        t,
        userAIdentity,
        Promise.resolve(groupId),
        1000,
        "2024-12-01",
      );

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, {
          groupId,
          year: 2024,
          month: 12,
        });

      expect(preview.totalExpenses).toBe(1);
      expect(preview.totalAmount).toBe(1000);
      expect(preview.payments).toHaveLength(1);
      expect(preview.payments[0].amount).toBe(500);
    });

    test("非メンバーはアクセス不可", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [userAIdentity]);

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "ユーザーBのグループ",
      });

      await expect(
        t.withIdentity(userBIdentity).query(api.settlements.getPreview, {
          groupId,
          year: 2024,
          month: 12,
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("create", () => {
    test("オーナーが精算を確定できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(
        t,
        userAIdentity,
        Promise.resolve(groupId),
        1000,
        "2024-12-01",
      );

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      expect(settlementId).toBeDefined();

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, {
          groupId,
          year: 2024,
          month: 12,
        });
      expect(preview.existingSettlementId).toBe(settlementId);
    });

    test("メンバー（非オーナー）は精算を確定できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      await expect(
        t.withIdentity(userBIdentity).mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        }),
      ).rejects.toThrow("精算を確定する権限がありません");
    });

    test("同じ期間の精算は重複作成できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      await expect(
        t.withIdentity(userAIdentity).mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        }),
      ).rejects.toThrow("この期間の精算は既に確定されています");
    });

    test("支出がない場合、即座に精算完了", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      const settlement = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, {
          settlementId,
        });

      expect(settlement.status).toBe("settled");
      expect(settlement.payments).toHaveLength(0);
    });
  });

  describe("markPaid", () => {
    test("受取人が支払い完了をマークできる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(
        t,
        userAIdentity,
        Promise.resolve(groupId),
        1000,
        "2024-12-01",
      );

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      const settlement = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, {
          settlementId,
        });

      expect(settlement.payments).toHaveLength(1);
      const paymentId = settlement.payments[0]._id;

      const result = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.markPaid, {
          paymentId,
        });

      expect(result.success).toBe(true);
      expect(result.allCompleted).toBe(true);

      const updatedSettlement = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, {
          settlementId,
        });
      expect(updatedSettlement.status).toBe("settled");
    });

    test("支払い元は支払い完了をマークできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(
        t,
        userAIdentity,
        Promise.resolve(groupId),
        1000,
        "2024-12-01",
      );

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      const settlement = await t
        .withIdentity(userBIdentity)
        .query(api.settlements.getById, {
          settlementId,
        });
      const paymentId = settlement.payments[0]._id;

      await expect(
        t
          .withIdentity(userBIdentity)
          .mutation(api.settlements.markPaid, { paymentId }),
      ).rejects.toThrow("支払い完了をマークする権限がありません");
    });
  });

  describe("listByGroup", () => {
    test("精算履歴を取得できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 11,
      });
      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2024,
        month: 12,
      });

      const settlements = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.listByGroup, {
          groupId,
        });

      expect(settlements).toHaveLength(2);
      expect(settlements[0].periodStart).toBe("2024-11-26");
      expect(settlements[1].periodStart).toBe("2024-10-26");
    });
  });

  describe("getById", () => {
    test("精算詳細を取得できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(
        t,
        userAIdentity,
        Promise.resolve(groupId),
        1000,
        "2024-12-01",
      );

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      const settlement = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, {
          settlementId,
        });

      expect(settlement.groupName).toBe("テストグループ");
      expect(settlement.status).toBe("pending");
      expect(settlement.payments).toHaveLength(1);
      expect(settlement.payments[0].amount).toBe(500);
    });

    test("非メンバーはアクセス不可", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [userAIdentity]);
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      await t.withIdentity(userBIdentity).mutation(api.groups.create, {
        name: "ユーザーBのグループ",
      });

      await expect(
        t
          .withIdentity(userBIdentity)
          .query(api.settlements.getById, { settlementId }),
      ).rejects.toThrow("この精算にアクセスする権限がありません");
    });
  });
});

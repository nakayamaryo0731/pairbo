import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

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
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

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
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

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

    test("メンバー（非オーナー）も精算を確定できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      // メンバーも精算確定可能
      const settlementId = await t
        .withIdentity(userBIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      expect(settlementId).toBeDefined();
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
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

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
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

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
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

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
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("carryOver", () => {
    test("差額を繰り越すと carried_over の精算が作成される", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      // Aが1000円支払い → BはAに500円
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

      await t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
        groupId,
        year: 2024,
        month: 12,
      });

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, { groupId, year: 2024, month: 12 });
      expect(preview.existingSettlementStatus).toBe("carried_over");
      expect(preview.canCancelCarryover).toBe(true);

      const settlements = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.listByGroup, { groupId });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].status).toBe("carried_over");
    });

    test("繰越分が翌月のプレビューに合算される", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      await t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 翌月にもAが1000円支払い → 繰越500 + 今月500 = B→Aに1000円
      await createExpense(t, userAIdentity, groupId, 1000, "2025-01-10");

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, { groupId, year: 2025, month: 1 });

      expect(preview.carryover).not.toBeNull();
      expect(preview.carryover!.amount).toBe(500);
      expect(preview.payments).toHaveLength(1);
      expect(preview.payments[0].amount).toBe(1000);
      expect(preview.payments[0].fromUserName).toBe("ユーザーB");
      expect(preview.payments[0].toUserName).toBe("ユーザーA");
    });

    test("繰越の連鎖: 2ヶ月連続で繰り越すと3ヶ月目に全額合算される", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      await t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
        groupId,
        year: 2024,
        month: 12,
      });

      await createExpense(t, userAIdentity, groupId, 2000, "2025-01-10");
      await t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
        groupId,
        year: 2025,
        month: 1,
      });

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, { groupId, year: 2025, month: 2 });

      // 12月分500 + 1月分1000 = 1500
      expect(preview.carryover!.amount).toBe(1500);
      expect(preview.payments).toHaveLength(1);
      expect(preview.payments[0].amount).toBe(1500);
    });

    test("精算のない月を挟んでも繰越が合算される", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      await t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
        groupId,
        year: 2024,
        month: 12,
      });

      // 1月は支出なし・精算なしのまま2月のプレビュー
      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, { groupId, year: 2025, month: 2 });

      expect(preview.carryover!.amount).toBe(500);
      expect(preview.payments).toHaveLength(1);
      expect(preview.payments[0].amount).toBe(500);
    });

    test("差額ゼロでは繰り越せない", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);

      await expect(
        t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        }),
      ).rejects.toThrow("繰り越す差額がありません");
    });

    test("後の期間の精算が存在すると繰り越せない", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");

      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2025,
        month: 1,
      });

      await expect(
        t.withIdentity(userAIdentity).mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        }),
      ).rejects.toThrow("後の期間の精算が既に存在するため");
    });

    test("精算確定時に繰越分が焼き込まれる（carryoverFrom記録）", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      const carryoverId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        });

      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2025,
          month: 1,
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, { settlementId });
      expect(detail.payments).toHaveLength(1);
      expect(detail.payments[0].amount).toBe(500);

      const settlement = await t.run(async (ctx) => ctx.db.get(settlementId));
      expect(settlement?.carryoverFrom).toBe(carryoverId);
    });

    test("繰り越された精算の支払いはmarkPaidできない", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        });

      const detail = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getById, { settlementId });
      expect(detail.payments[0].canMarkPaid).toBe(false);

      await expect(
        t.withIdentity(userAIdentity).mutation(api.settlements.markPaid, {
          paymentId: detail.payments[0]._id,
        }),
      ).rejects.toThrow("繰り越しされた精算は支払い対象ではありません");
    });
  });

  describe("cancelCarryOver", () => {
    test("繰り越しを取り消すと未確定に戻る", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        });

      await t
        .withIdentity(userBIdentity)
        .mutation(api.settlements.cancelCarryOver, { settlementId });

      const preview = await t
        .withIdentity(userAIdentity)
        .query(api.settlements.getPreview, { groupId, year: 2024, month: 12 });
      expect(preview.existingSettlementId).toBeNull();
      expect(preview.payments).toHaveLength(1);

      const payments = await t.run(async (ctx) =>
        ctx.db.query("settlementPayments").collect(),
      );
      expect(payments).toHaveLength(0);
    });

    test("後の期間の精算に合算済みだと取り消せない", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.carryOver, {
          groupId,
          year: 2024,
          month: 12,
        });

      await t.withIdentity(userAIdentity).mutation(api.settlements.create, {
        groupId,
        year: 2025,
        month: 1,
      });

      await expect(
        t
          .withIdentity(userAIdentity)
          .mutation(api.settlements.cancelCarryOver, { settlementId }),
      ).rejects.toThrow("後の期間の精算に合算済みのため取り消せません");
    });

    test("繰り越し以外の精算は取り消せない", async () => {
      const t = convexTest(schema, modules);
      const groupId = await createGroupWithMembers(t, [
        userAIdentity,
        userBIdentity,
      ]);
      await createExpense(t, userAIdentity, groupId, 1000, "2024-12-01");
      const settlementId = await t
        .withIdentity(userAIdentity)
        .mutation(api.settlements.create, {
          groupId,
          year: 2024,
          month: 12,
        });

      await expect(
        t
          .withIdentity(userAIdentity)
          .mutation(api.settlements.cancelCarryOver, { settlementId }),
      ).rejects.toThrow("繰り越しされた精算ではありません");
    });
  });
});

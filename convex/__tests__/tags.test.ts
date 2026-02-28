import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

const testIdentity = {
  subject: "test_clerk_user_1",
  name: "テストユーザー",
  email: "test@example.com",
};

async function setupPremiumGroup(t: ReturnType<typeof convexTest>) {
  const groupId = await t
    .withIdentity(testIdentity)
    .mutation(api.groups.create, { name: "テストグループ" });

  const detail = await t
    .withIdentity(testIdentity)
    .query(api.groups.getDetail, { groupId });

  const userId = detail.members[0].userId;
  const now = Date.now();
  await t.run(async (ctx) => {
    await ctx.db.insert("subscriptions", {
      userId,
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

  return { groupId, userId };
}

describe("tags", () => {
  describe("create", () => {
    test("タグを作成すると sortOrder が設定される", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      const tagId1 = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ1" });

      const tagId2 = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ2" });

      const tag1 = await t.run(async (ctx) => ctx.db.get(tagId1));
      const tag2 = await t.run(async (ctx) => ctx.db.get(tagId2));

      expect(tag1?.sortOrder).toBe(0);
      expect(tag2?.sortOrder).toBe(1);
    });
  });

  describe("list", () => {
    test("sortOrder 順でタグが返される", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "C" });
      await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "A" });
      await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "B" });

      const tags = await t
        .withIdentity(testIdentity)
        .query(api.tags.list, { groupId });

      expect(tags.map((t: { name: string }) => t.name)).toEqual([
        "C",
        "A",
        "B",
      ]);
    });
  });

  describe("reorder", () => {
    test("タグの並び順を変更できる", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      const id1 = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ1" });
      const id2 = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ2" });
      const id3 = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ3" });

      // 3, 1, 2 の順に並べ替え
      await t
        .withIdentity(testIdentity)
        .mutation(api.tags.reorder, { groupId, tagIds: [id3, id1, id2] });

      const tags = await t
        .withIdentity(testIdentity)
        .query(api.tags.list, { groupId });

      expect(tags.map((t: { name: string }) => t.name)).toEqual([
        "タグ3",
        "タグ1",
        "タグ2",
      ]);
    });

    test("他グループのタグを含めると失敗する", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      const tagId = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "タグ1" });

      const otherGroupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "別グループ" });

      await expect(
        t.withIdentity(testIdentity).mutation(api.tags.reorder, {
          groupId: otherGroupId,
          tagIds: [tagId],
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    test("タグの名前と色を変更できる", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      const tagId = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "元の名前" });

      await t.withIdentity(testIdentity).mutation(api.tags.update, {
        tagId,
        name: "新しい名前",
        color: "red",
      });

      const tag = await t.run(async (ctx) => ctx.db.get(tagId));
      expect(tag?.name).toBe("新しい名前");
      expect(tag?.color).toBe("red");
    });
  });

  describe("remove", () => {
    test("タグを削除すると関連する expenseTags も削除される", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setupPremiumGroup(t);

      const tagId = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.create, { groupId, name: "削除タグ" });

      // 支出を作成してタグを付ける
      const detail = await t
        .withIdentity(testIdentity)
        .query(api.groups.getDetail, { groupId });

      const expenseId = await t
        .withIdentity(testIdentity)
        .mutation(api.expenses.create, {
          groupId,
          amount: 1000,
          categoryId: detail.categories[0]._id,
          paidBy: detail.members[0].userId,
          date: "2024-12-30",
        });

      await t.withIdentity(testIdentity).mutation(api.expenses.updateTags, {
        expenseId,
        tagIds: [tagId],
      });

      // タグ削除
      const result = await t
        .withIdentity(testIdentity)
        .mutation(api.tags.remove, { tagId });

      expect(result.deletedExpenseTagsCount).toBe(1);

      // タグが削除されている
      const tag = await t.run(async (ctx) => ctx.db.get(tagId));
      expect(tag).toBeNull();
    });
  });
});

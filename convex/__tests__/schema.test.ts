import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";

// Convex関数モジュールを明示的にインポート
// Note: convex-testの型定義がRecord<string, () => Promise<any>>を期待するため型アサーションが必要
const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

describe("schema", () => {
  describe("users テーブル", () => {
    test("ユーザーを作成できる", async () => {
      const t = convexTest(schema, modules);

      const userId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(userId).toBeDefined();

      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user).not.toBeNull();
      expect(user?.displayName).toBe("テストユーザー");
      expect(user?.clerkId).toBe("test_clerk_id");
    });

    test("clerkIdでユーザーを検索できる", async () => {
      const t = convexTest(schema, modules);

      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          clerkId: "unique_clerk_id",
          displayName: "検索テスト用ユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", "unique_clerk_id"))
          .unique();
      });

      expect(user).not.toBeNull();
      expect(user?.displayName).toBe("検索テスト用ユーザー");
    });
  });

  describe("groups テーブル", () => {
    test("グループを作成できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t.run(async (ctx) => {
        return await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(groupId).toBeDefined();

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group).not.toBeNull();
      expect(group?.name).toBe("テストグループ");
      expect(group?.closingDay).toBe(25);
    });
  });

  describe("groupMembers テーブル", () => {
    test("グループメンバーを追加できる", async () => {
      const t = convexTest(schema, modules);

      // ユーザーとグループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "member_test_user",
          displayName: "メンバーテスト",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "メンバーテストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      // メンバー追加
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "owner",
          joinedAt: Date.now(),
        });
      });

      expect(memberId).toBeDefined();

      // インデックスで検索
      const member = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", groupId).eq("userId", userId),
          )
          .unique();
      });

      expect(member).not.toBeNull();
      expect(member?.role).toBe("owner");
    });
  });
});

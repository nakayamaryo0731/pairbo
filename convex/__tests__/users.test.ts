import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

// テスト用のユーザー認証情報
const testIdentity = {
  subject: "test_clerk_user_1",
  name: "テストユーザー",
  email: "test@example.com",
  pictureUrl: "https://example.com/avatar.png",
};

const testIdentityMinimal = {
  subject: "test_clerk_user_minimal",
  // name, email, pictureUrl がない場合
};

describe("users", () => {
  describe("ensureUser", () => {
    test("新規ユーザーが作成され、IDが返される", async () => {
      const t = convexTest(schema, modules);

      const userId = await t
        .withIdentity(testIdentity)
        .mutation(api.users.ensureUser, {});

      expect(userId).toBeDefined();

      // ユーザーがDBに存在することを確認
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(userId);
      });

      expect(user).not.toBeNull();
    });

    test("ユーザー情報が正しく保存される", async () => {
      const t = convexTest(schema, modules);

      await t.withIdentity(testIdentity).mutation(api.users.ensureUser, {});

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentity.subject),
          )
          .unique();
      });

      expect(user?.clerkId).toBe(testIdentity.subject);
      expect(user?.displayName).toBe(testIdentity.name);
      expect(user?.avatarUrl).toBe(testIdentity.pictureUrl);
    });

    test("既存ユーザーの場合は既存のIDが返される", async () => {
      const t = convexTest(schema, modules);

      // 1回目の呼び出し
      const userId1 = await t
        .withIdentity(testIdentity)
        .mutation(api.users.ensureUser, {});

      // 2回目の呼び出し
      const userId2 = await t
        .withIdentity(testIdentity)
        .mutation(api.users.ensureUser, {});

      expect(userId1).toBe(userId2);
    });

    test("同じClerkIDで複数のユーザーが作成されない", async () => {
      const t = convexTest(schema, modules);

      // 複数回呼び出し
      await t.withIdentity(testIdentity).mutation(api.users.ensureUser, {});
      await t.withIdentity(testIdentity).mutation(api.users.ensureUser, {});
      await t.withIdentity(testIdentity).mutation(api.users.ensureUser, {});

      // ユーザー数を確認
      const users = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentity.subject),
          )
          .collect();
      });

      expect(users).toHaveLength(1);
    });

    test("名前がない場合はデフォルト名が設定される", async () => {
      const t = convexTest(schema, modules);

      const identityWithEmail = {
        subject: "test_no_name",
        email: "noname@example.com",
      };

      await t
        .withIdentity(identityWithEmail)
        .mutation(api.users.ensureUser, {});

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identityWithEmail.subject),
          )
          .unique();
      });

      // emailがdisplayNameに使われる
      expect(user?.displayName).toBe(identityWithEmail.email);
    });

    test("名前もメールもない場合は「名無し」が設定される", async () => {
      const t = convexTest(schema, modules);

      await t
        .withIdentity(testIdentityMinimal)
        .mutation(api.users.ensureUser, {});

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentityMinimal.subject),
          )
          .unique();
      });

      expect(user?.displayName).toBe("名無し");
    });

    test("認証なしではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(t.mutation(api.users.ensureUser, {})).rejects.toThrow();
    });
  });
});

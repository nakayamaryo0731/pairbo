import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import { PRESET_CATEGORIES } from "../lib/presetCategories";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

// テスト用のユーザー認証情報
const testIdentity = {
  subject: "test_clerk_user_1",
  name: "テストユーザー",
  email: "test@example.com",
};

const testIdentity2 = {
  subject: "test_clerk_user_2",
  name: "テストユーザー2",
  email: "test2@example.com",
};

describe("groups", () => {
  describe("create", () => {
    test("グループを作成できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      expect(groupId).toBeDefined();

      // グループが正しく作成されたか確認
      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group).not.toBeNull();
      expect(group?.name).toBe("テストグループ");
      expect(group?.closingDay).toBe(25); // デフォルト値
    });

    test("説明付きでグループを作成できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "説明付きグループ",
          description: "これはテスト用のグループです",
        });

      const group = await t.run(async (ctx) => {
        return await ctx.db.get(groupId);
      });

      expect(group?.description).toBe("これはテスト用のグループです");
    });

    test("作成者がオーナーとしてメンバーに追加される", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "オーナーテスト",
        });

      // 作成者のユーザーIDを取得
      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentity.subject),
          )
          .unique();
      });

      // メンバーシップを確認
      const membership = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", groupId).eq("userId", user!._id),
          )
          .unique();
      });

      expect(membership).not.toBeNull();
      expect(membership?.role).toBe("owner");
    });

    test("プリセットカテゴリが作成される", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "カテゴリテスト",
        });

      // カテゴリを取得
      const categories = await t.run(async (ctx) => {
        return await ctx.db
          .query("categories")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .collect();
      });

      expect(categories).toHaveLength(PRESET_CATEGORIES.length);

      // 各プリセットカテゴリが存在するか確認
      const categoryNames = categories.map((c) => c.name);
      for (const preset of PRESET_CATEGORIES) {
        expect(categoryNames).toContain(preset.name);
      }
    });

    test("空のグループ名はエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.withIdentity(testIdentity).mutation(api.groups.create, {
          name: "",
        }),
      ).rejects.toThrow("グループ名を入力してください");
    });

    test("スペースのみのグループ名はエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.withIdentity(testIdentity).mutation(api.groups.create, {
          name: "   ",
        }),
      ).rejects.toThrow("グループ名を入力してください");
    });

    test("50文字を超えるグループ名はエラーになる", async () => {
      const t = convexTest(schema, modules);

      const longName = "あ".repeat(51);

      await expect(
        t.withIdentity(testIdentity).mutation(api.groups.create, {
          name: longName,
        }),
      ).rejects.toThrow("グループ名は50文字以内で入力してください");
    });

    test("50文字ちょうどのグループ名は許可される", async () => {
      const t = convexTest(schema, modules);

      const exactName = "あ".repeat(50);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: exactName,
        });

      expect(groupId).toBeDefined();
    });

    test("認証なしではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.groups.create, {
          name: "認証なしテスト",
        }),
      ).rejects.toThrow();
    });
  });

  describe("listMyGroups", () => {
    test("所属するグループの一覧を取得できる", async () => {
      const t = convexTest(schema, modules);

      // グループを作成
      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "グループ1",
      });

      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "グループ2",
      });

      // グループ一覧を取得
      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups).toHaveLength(2);
    });

    test("グループ名と説明が正しく返される", async () => {
      const t = convexTest(schema, modules);

      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "詳細テストグループ",
        description: "詳細な説明",
      });

      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups[0].name).toBe("詳細テストグループ");
      expect(groups[0].description).toBe("詳細な説明");
    });

    test("メンバー数が正しく返される", async () => {
      const t = convexTest(schema, modules);

      // ユーザー1でグループ作成
      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "メンバーカウントテスト",
        });

      // ユーザー2をメンバーとして追加（直接DBに追加）
      await t.run(async (ctx) => {
        // ユーザー2を作成
        const user2Id = await ctx.db.insert("users", {
          clerkId: testIdentity2.subject,
          displayName: testIdentity2.name!,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // メンバーとして追加
        await ctx.db.insert("groupMembers", {
          groupId,
          userId: user2Id,
          role: "member",
          joinedAt: Date.now(),
        });
      });

      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups[0].memberCount).toBe(2);
    });

    test("自分のロールが正しく返される", async () => {
      const t = convexTest(schema, modules);

      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "ロールテスト",
      });

      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups[0].myRole).toBe("owner");
    });

    test("参加日時の新しい順にソートされる", async () => {
      const t = convexTest(schema, modules);

      // グループを順番に作成
      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "古いグループ",
      });

      // 少し待つ（タイムスタンプを確実に異ならせる）
      await new Promise((resolve) => setTimeout(resolve, 10));

      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "新しいグループ",
      });

      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups).toHaveLength(2);
      expect(groups[0].name).toBe("新しいグループ");
      expect(groups[1].name).toBe("古いグループ");
    });

    test("所属していないグループは含まれない", async () => {
      const t = convexTest(schema, modules);

      // ユーザー1でグループ作成
      await t.withIdentity(testIdentity).mutation(api.groups.create, {
        name: "ユーザー1のグループ",
      });

      // ユーザー2でグループ作成
      await t.withIdentity(testIdentity2).mutation(api.groups.create, {
        name: "ユーザー2のグループ",
      });

      // ユーザー1のグループ一覧
      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("ユーザー1のグループ");
    });

    test("グループが存在しない場合は空配列を返す", async () => {
      const t = convexTest(schema, modules);

      // まずユーザーを作成（ensureUserを呼ぶ）
      await t.withIdentity(testIdentity).mutation(api.users.ensureUser, {});

      const groups = await t
        .withIdentity(testIdentity)
        .query(api.groups.listMyGroups, {});

      expect(groups).toEqual([]);
    });
  });
});

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
};

const testIdentity2 = {
  subject: "test_clerk_user_2",
  name: "テストユーザー2",
  email: "test2@example.com",
};

describe("categories", () => {
  describe("create", () => {
    test("カスタムカテゴリを作成できる", async () => {
      const t = convexTest(schema, modules);

      // グループを作成
      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // カテゴリを作成
      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "カスタムカテゴリ",
          icon: "gamepad-2",
        });

      expect(categoryId).toBeDefined();

      // 作成されたカテゴリを確認
      const category = await t.run(async (ctx) => {
        return await ctx.db.get(categoryId);
      });

      expect(category).not.toBeNull();
      expect(category?.name).toBe("カスタムカテゴリ");
      expect(category?.icon).toBe("gamepad-2");
      expect(category?.isPreset).toBe(false);
    });

    test("メンバーでないユーザーはカテゴリを作成できない", async () => {
      const t = convexTest(schema, modules);

      // ユーザー1がグループを作成
      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // ユーザー2がカテゴリ作成を試みる
      await expect(
        t.withIdentity(testIdentity2).mutation(api.categories.create, {
          groupId,
          name: "不正なカテゴリ",
          icon: "cross",
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });

    test("同名のカテゴリは作成できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // 最初のカテゴリを作成
      await t.withIdentity(testIdentity).mutation(api.categories.create, {
        groupId,
        name: "カスタムカテゴリ",
        icon: "gamepad-2",
      });

      // 同名のカテゴリを作成しようとする
      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.create, {
          groupId,
          name: "カスタムカテゴリ",
          icon: "star",
        }),
      ).rejects.toThrow("同じ名前のカテゴリが既に存在します");
    });

    test("大文字小文字を無視して重複チェックする", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await t.withIdentity(testIdentity).mutation(api.categories.create, {
        groupId,
        name: "Test",
        icon: "gamepad-2",
      });

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.create, {
          groupId,
          name: "TEST",
          icon: "star",
        }),
      ).rejects.toThrow("同じ名前のカテゴリが既に存在します");
    });

    test("空のカテゴリ名はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.create, {
          groupId,
          name: "",
          icon: "gamepad-2",
        }),
      ).rejects.toThrow("カテゴリ名を入力してください");
    });

    test("不正なアイコン名はエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.create, {
          groupId,
          name: "テスト",
          icon: "Invalid Icon",
        }),
      ).rejects.toThrow("アイコン名の形式が正しくありません");
    });
  });

  describe("update", () => {
    test("カスタムカテゴリを更新できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "元の名前",
          icon: "gamepad-2",
        });

      await t.withIdentity(testIdentity).mutation(api.categories.update, {
        categoryId,
        name: "新しい名前",
        icon: "star",
      });

      const category = await t.run(async (ctx) => {
        return await ctx.db.get(categoryId);
      });

      expect(category?.name).toBe("新しい名前");
      expect(category?.icon).toBe("star");
    });

    test("プリセットカテゴリは更新できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // プリセットカテゴリを取得
      const presetCategory = await t.run(async (ctx) => {
        return await ctx.db
          .query("categories")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .filter((q) => q.eq(q.field("isPreset"), true))
          .first();
      });

      expect(presetCategory).not.toBeNull();

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.update, {
          categoryId: presetCategory!._id,
          name: "変更した名前",
          icon: "wrench",
        }),
      ).rejects.toThrow("プリセットカテゴリは編集できません");
    });

    test("メンバーでないユーザーは更新できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "テスト",
          icon: "gamepad-2",
        });

      await expect(
        t.withIdentity(testIdentity2).mutation(api.categories.update, {
          categoryId,
          name: "不正な更新",
          icon: "cross",
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("remove", () => {
    test("未使用のカスタムカテゴリを削除できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "削除対象",
          icon: "folder",
        });

      await t.withIdentity(testIdentity).mutation(api.categories.remove, {
        categoryId,
      });

      const category = await t.run(async (ctx) => {
        return await ctx.db.get(categoryId);
      });

      expect(category).toBeNull();
    });

    test("プリセットカテゴリは削除できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const presetCategory = await t.run(async (ctx) => {
        return await ctx.db
          .query("categories")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .filter((q) => q.eq(q.field("isPreset"), true))
          .first();
      });

      expect(presetCategory).not.toBeNull();

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.remove, {
          categoryId: presetCategory!._id,
        }),
      ).rejects.toThrow("プリセットカテゴリは削除できません");
    });

    test("使用中のカテゴリは削除できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "使用中カテゴリ",
          icon: "tag",
        });

      // ユーザー情報を取得
      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentity.subject),
          )
          .unique();
      });

      // このカテゴリを使った支出を作成
      await t.withIdentity(testIdentity).mutation(api.expenses.create, {
        groupId,
        categoryId,
        amount: 1000,
        date: "2024-01-15",
        paidBy: user!._id,
      });

      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.remove, {
          categoryId,
        }),
      ).rejects.toThrow(
        "このカテゴリは使用中のため削除できません。先に支出のカテゴリを変更してください。",
      );
    });

    test("メンバーでないユーザーは削除できない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "テスト",
          icon: "gamepad-2",
        });

      await expect(
        t.withIdentity(testIdentity2).mutation(api.categories.remove, {
          categoryId,
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("canDelete", () => {
    test("未使用のカスタムカテゴリは削除可能", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "未使用カテゴリ",
          icon: "heart",
        });

      const result = await t
        .withIdentity(testIdentity)
        .query(api.categories.canDelete, {
          categoryId,
        });

      expect(result.canDelete).toBe(true);
      expect(result.reason).toBeNull();
      expect(result.usageCount).toBe(0);
    });

    test("プリセットカテゴリは削除不可", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const presetCategory = await t.run(async (ctx) => {
        return await ctx.db
          .query("categories")
          .withIndex("by_group", (q) => q.eq("groupId", groupId))
          .filter((q) => q.eq(q.field("isPreset"), true))
          .first();
      });

      const result = await t
        .withIdentity(testIdentity)
        .query(api.categories.canDelete, {
          categoryId: presetCategory!._id,
        });

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe("preset");
      expect(result.usageCount).toBe(0);
    });

    test("使用中のカテゴリは削除不可（使用回数を返す）", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const categoryId = await t
        .withIdentity(testIdentity)
        .mutation(api.categories.create, {
          groupId,
          name: "使用中カテゴリ",
          icon: "tag",
        });

      const user = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", testIdentity.subject),
          )
          .unique();
      });

      // 3件の支出を作成
      for (let i = 0; i < 3; i++) {
        await t.withIdentity(testIdentity).mutation(api.expenses.create, {
          groupId,
          categoryId,
          amount: 1000,
          date: `2024-01-${15 + i}`,
          paidBy: user!._id,
        });
      }

      const result = await t
        .withIdentity(testIdentity)
        .query(api.categories.canDelete, {
          categoryId,
        });

      expect(result.canDelete).toBe(false);
      expect(result.reason).toBe("in_use");
      expect(result.usageCount).toBe(3);
    });
  });

  describe("reorder", () => {
    test("カテゴリの順序を変更できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      // カテゴリを取得（プリセットがある）
      const detail = await t
        .withIdentity(testIdentity)
        .query(api.groups.getDetail, { groupId });

      const originalOrder = detail.categories.map((c) => c._id);
      expect(originalOrder.length).toBeGreaterThan(0);

      // 順序を逆にする
      const reversedOrder = [...originalOrder].reverse();

      await t.withIdentity(testIdentity).mutation(api.categories.reorder, {
        groupId,
        categoryIds: reversedOrder,
      });

      // 並び替え後のカテゴリを取得
      const updatedDetail = await t
        .withIdentity(testIdentity)
        .query(api.groups.getDetail, { groupId });

      const newOrder = updatedDetail.categories.map((c) => c._id);
      expect(newOrder).toEqual(reversedOrder);
    });

    test("メンバーでないユーザーは並び替えできない", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const detail = await t
        .withIdentity(testIdentity)
        .query(api.groups.getDetail, { groupId });

      await expect(
        t.withIdentity(testIdentity2).mutation(api.categories.reorder, {
          groupId,
          categoryIds: detail.categories.map((c) => c._id),
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });

    test("別グループのカテゴリIDを指定するとエラー", async () => {
      const t = convexTest(schema, modules);

      const groupId1 = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "グループ1",
        });

      const groupId2 = await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, {
          name: "グループ2",
        });

      const detail2 = await t
        .withIdentity(testIdentity)
        .query(api.groups.getDetail, { groupId: groupId2 });

      // グループ2のカテゴリIDをグループ1で使おうとする
      await expect(
        t.withIdentity(testIdentity).mutation(api.categories.reorder, {
          groupId: groupId1,
          categoryIds: detail2.categories.map((c) => c._id),
        }),
      ).rejects.toThrow("無効なカテゴリが指定されました");
    });
  });
});

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

const testIdentity = {
  subject: "test_clerk_user_1",
  name: "テストユーザー",
  email: "test@example.com",
};

describe("inquiries", () => {
  describe("create", () => {
    test("問い合わせを作成できる", async () => {
      const t = convexTest(schema, modules);

      // ユーザー作成のためにグループ作成を実行
      await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      const inquiryId = await t
        .withIdentity(testIdentity)
        .mutation(api.inquiries.create, {
          category: "feature_request",
          body: "新しい機能が欲しいです",
        });

      expect(inquiryId).toBeDefined();

      const inquiry = await t.run(async (ctx) =>
        ctx.db.get("inquiries", inquiryId),
      );
      expect(inquiry?.category).toBe("feature_request");
      expect(inquiry?.body).toBe("新しい機能が欲しいです");
    });

    test("空の本文ではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      await expect(
        t.withIdentity(testIdentity).mutation(api.inquiries.create, {
          category: "bug_report",
          body: "   ",
        }),
      ).rejects.toThrow("お問い合わせ内容を入力してください");
    });

    test("2000文字を超える本文ではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      const longBody = "あ".repeat(2001);
      await expect(
        t.withIdentity(testIdentity).mutation(api.inquiries.create, {
          category: "other",
          body: longBody,
        }),
      ).rejects.toThrow("2000文字以内");
    });

    test("未認証ではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.inquiries.create, {
          category: "feature_request",
          body: "テスト",
        }),
      ).rejects.toThrow();
    });

    test("レート制限を超えるとエラーになる", async () => {
      const t = convexTest(schema, modules);

      await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      // 5件送信（上限）
      for (let i = 0; i < 5; i++) {
        await t.withIdentity(testIdentity).mutation(api.inquiries.create, {
          category: "feature_request",
          body: `問い合わせ${i + 1}`,
        });
      }

      // 6件目はエラー
      await expect(
        t.withIdentity(testIdentity).mutation(api.inquiries.create, {
          category: "feature_request",
          body: "6件目",
        }),
      ).rejects.toThrow("送信回数の上限");
    });

    test("全カテゴリで作成できる", async () => {
      const t = convexTest(schema, modules);

      await t
        .withIdentity(testIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      const categories = ["feature_request", "bug_report", "other"] as const;

      for (const category of categories) {
        const id = await t
          .withIdentity(testIdentity)
          .mutation(api.inquiries.create, {
            category,
            body: `${category}のテスト`,
          });
        expect(id).toBeDefined();
      }
    });
  });
});

import { convexTest, TestConvex } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import { REVIEW_RULES } from "../domain/review";

const modules = import.meta.glob("../**/*.ts");

type TestCtx = TestConvex<typeof schema>;

const DAY_MS = 24 * 60 * 60 * 1000;
const CLERK_USER = "review_test_user";
const CLERK_PARTNER = "review_test_partner";

const VALID_REVIEW = {
  relationship: "cohabiting" as const,
  before: "レシートを見ながら月末に電卓で計算していた",
  change: "精算でもめなくなった",
  publishConsent: true,
};

async function setup(
  t: TestCtx,
  opts: {
    pairedDaysAgo?: number;
    expenseCount?: number;
    withPartner?: boolean;
  } = {},
) {
  const {
    pairedDaysAgo = REVIEW_RULES.MIN_PAIRED_DAYS,
    expenseCount = REVIEW_RULES.MIN_EXPENSES,
    withPartner = true,
  } = opts;
  const now = Date.now();

  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      clerkId: CLERK_USER,
      displayName: "ユーザー",
      createdAt: now,
      updatedAt: now,
    });
    const groupId = await ctx.db.insert("groups", {
      name: "テストグループ",
      closingDay: 25,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: "owner",
      joinedAt: now - 365 * DAY_MS,
    });
    if (withPartner) {
      const partnerId = await ctx.db.insert("users", {
        clerkId: CLERK_PARTNER,
        displayName: "パートナー",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert("groupMembers", {
        groupId,
        userId: partnerId,
        role: "member",
        joinedAt: now - pairedDaysAgo * DAY_MS,
      });
    }
    const categoryId = await ctx.db.insert("categories", {
      groupId,
      name: "食費",
      icon: "utensils",
      isPreset: true,
      sortOrder: 0,
      createdAt: now,
    });
    for (let i = 0; i < expenseCount; i++) {
      await ctx.db.insert("expenses", {
        groupId,
        amount: 1000,
        categoryId,
        paidBy: userId,
        date: "2026-09-01",
        splitMethod: "equal",
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { userId, groupId };
  });
}

function asUser(t: TestCtx) {
  return t.withIdentity({ subject: CLERK_USER });
}

describe("reviews", () => {
  describe("shouldShowPrompt", () => {
    test("条件を満たすグループでは表示する", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t);

      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(true);
    });

    test("1人のグループでは表示しない", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t, { withPartner: false });

      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });

    test("ふたりで使い始めて間もないグループでは表示しない", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t, {
        pairedDaysAgo: REVIEW_RULES.MIN_PAIRED_DAYS - 1,
      });

      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });

    test("支出が少ないグループでは表示しない", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t, {
        expenseCount: REVIEW_RULES.MIN_EXPENSES - 1,
      });

      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });

    test("閉じた後は表示しない", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t);

      await asUser(t).mutation(api.reviews.closePrompt, {});

      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });

    test("メンバーでないグループでは表示しない", async () => {
      const t = convexTest(schema, modules);
      const { groupId } = await setup(t);
      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          clerkId: "review_outsider",
          displayName: "部外者",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      });

      expect(
        await t
          .withIdentity({ subject: "review_outsider" })
          .query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });
  });

  describe("submit", () => {
    test("感想を保存し、以後は表示しない", async () => {
      const t = convexTest(schema, modules);
      const { userId, groupId } = await setup(t);

      const reviewId = await asUser(t).mutation(api.reviews.submit, {
        ...VALID_REVIEW,
        ageRange: "20s",
        likes: "  ふたりで同じ画面を見られる  ",
        improvements: "",
      });

      const review = await t.run(async (ctx) =>
        ctx.db.get("reviews", reviewId),
      );
      expect(review).toMatchObject({
        userId,
        relationship: "cohabiting",
        ageRange: "20s",
        before: VALID_REVIEW.before,
        change: VALID_REVIEW.change,
        likes: "ふたりで同じ画面を見られる",
        publishConsent: true,
      });
      expect(review?.improvements).toBeUndefined();
      expect(
        await asUser(t).query(api.reviews.shouldShowPrompt, { groupId }),
      ).toBe(false);
    });

    test("2回目の送信はエラー", async () => {
      const t = convexTest(schema, modules);
      await setup(t);

      await asUser(t).mutation(api.reviews.submit, VALID_REVIEW);

      await expect(
        asUser(t).mutation(api.reviews.submit, VALID_REVIEW),
      ).rejects.toThrow("感想はすでに送信済みです");
    });

    test("必須項目が空ならエラー", async () => {
      const t = convexTest(schema, modules);
      await setup(t);

      await expect(
        asUser(t).mutation(api.reviews.submit, {
          ...VALID_REVIEW,
          change: " ",
        }),
      ).rejects.toThrow("Pairboを使って変わったことを入力してください");
    });

    test("未認証ではエラー", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.reviews.submit, VALID_REVIEW),
      ).rejects.toThrow();
    });
  });

  describe("closePrompt", () => {
    test("何度呼んでも最初に閉じた日時を保つ", async () => {
      const t = convexTest(schema, modules);
      const { userId } = await setup(t);

      await asUser(t).mutation(api.reviews.closePrompt, {});
      const first = await t.run(
        async (ctx) =>
          (await ctx.db.get("users", userId))?.reviewPromptClosedAt,
      );
      await asUser(t).mutation(api.reviews.closePrompt, {});
      const second = await t.run(
        async (ctx) =>
          (await ctx.db.get("users", userId))?.reviewPromptClosedAt,
      );

      expect(first).toBeDefined();
      expect(second).toBe(first);
    });
  });
});

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");

const adminIdentity = {
  subject: "admin_clerk_id",
  name: "管理者",
  email: "admin@example.com",
};

const userIdentity = {
  subject: "user_clerk_id",
  name: "一般ユーザー",
  email: "user@example.com",
};

async function setupAdmin(t: ReturnType<typeof convexTest>) {
  // ユーザー作成
  await t.withIdentity(adminIdentity).mutation(api.users.ensureUser, {});
  // isAdminフラグを付与
  const user = await t.run(async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.find((u) => u.clerkId === "admin_clerk_id") ?? null;
  });
  if (user) {
    await t.run(async (ctx) => {
      await ctx.db.patch(user._id, { isAdmin: true });
    });
  }
}

async function setupNormalUser(t: ReturnType<typeof convexTest>) {
  await t.withIdentity(userIdentity).mutation(api.users.ensureUser, {});
}

describe("admin", () => {
  describe("getSummary", () => {
    test("管理者はサマリーを取得できる", async () => {
      const t = convexTest(schema, modules);
      await setupAdmin(t);

      const summary = await t
        .withIdentity(adminIdentity)
        .query(api.admin.getSummary, {});

      expect(summary.totalUsers).toBe(1);
      expect(summary.dau).toBe(0);
      expect(summary.wau).toBe(0);
      expect(summary.mau).toBe(0);
      expect(summary.totalGroups).toBe(0);
      expect(summary.totalExpenses).toBe(0);
      expect(summary.premiumCount).toBe(0);
      expect(summary.inquiryCount7d).toBe(0);
    });

    test("直近7日の問い合わせ数をカウントできる", async () => {
      const t = convexTest(schema, modules);
      await setupAdmin(t);
      await setupNormalUser(t);

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      await t.run(async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const user = users.find((u) => u.clerkId === "user_clerk_id");
        if (!user) throw new Error("user not found");
        await ctx.db.insert("inquiries", {
          userId: user._id,
          category: "bug_report",
          body: "最近の問い合わせ",
          createdAt: now - oneDay,
        });
        await ctx.db.insert("inquiries", {
          userId: user._id,
          category: "other",
          body: "古い問い合わせ",
          createdAt: now - 10 * oneDay,
        });
      });

      const summary = await t
        .withIdentity(adminIdentity)
        .query(api.admin.getSummary, {});

      expect(summary.inquiryCount7d).toBe(1);
    });

    test("非管理者はサマリーを取得できない", async () => {
      const t = convexTest(schema, modules);
      await setupNormalUser(t);

      await expect(
        t.withIdentity(userIdentity).query(api.admin.getSummary, {}),
      ).rejects.toThrow("管理者権限が必要です");
    });
  });

  describe("getUsers", () => {
    test("管理者はユーザー一覧を取得できる", async () => {
      const t = convexTest(schema, modules);
      await setupAdmin(t);
      await setupNormalUser(t);

      const users = await t
        .withIdentity(adminIdentity)
        .query(api.admin.getUsers, {});

      expect(users).toHaveLength(2);
      const admin = users.find((u) => u.displayName === "管理者");
      expect(admin).toBeDefined();
      expect(admin?.plan).toBe("free");
      expect(admin?.groupCount).toBe(0);
      expect(admin?.expenseCount).toBe(0);
    });

    test("非管理者はユーザー一覧を取得できない", async () => {
      const t = convexTest(schema, modules);
      await setupNormalUser(t);

      await expect(
        t.withIdentity(userIdentity).query(api.admin.getUsers, {}),
      ).rejects.toThrow("管理者権限が必要です");
    });
  });

  describe("getGroups", () => {
    test("管理者はグループ一覧を取得できる", async () => {
      const t = convexTest(schema, modules);
      await setupAdmin(t);

      // グループ作成
      await t
        .withIdentity(adminIdentity)
        .mutation(api.groups.create, { name: "テストグループ" });

      const groups = await t
        .withIdentity(adminIdentity)
        .query(api.admin.getGroups, {});

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("テストグループ");
      expect(groups[0].memberCount).toBe(1);
    });

    test("非管理者はグループ一覧を取得できない", async () => {
      const t = convexTest(schema, modules);
      await setupNormalUser(t);

      await expect(
        t.withIdentity(userIdentity).query(api.admin.getGroups, {}),
      ).rejects.toThrow("管理者権限が必要です");
    });
  });
});

describe("resetReleaseSeenSince", () => {
  test("since 以降の既読のみリセットし、それ以前は残す", async () => {
    const t = convexTest(schema, modules);
    await setupAdmin(t);
    await setupNormalUser(t);

    const since = Date.now();
    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      for (const u of users) {
        await ctx.db.patch(u._id, {
          lastSeenReleaseAt:
            u.clerkId === "admin_clerk_id" ? since + 1000 : since - 1000,
        });
      }
    });

    const result = await t.mutation(internal.admin.resetReleaseSeenSince, {
      since,
    });
    expect(result.reset).toBe(1);

    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    const after = users.find((u) => u.clerkId === "admin_clerk_id");
    const before = users.find((u) => u.clerkId === "user_clerk_id");
    expect(after?.lastSeenReleaseAt).toBeUndefined();
    expect(before?.lastSeenReleaseAt).toBe(since - 1000);
  });
});

describe("getInquiries", () => {
  test("管理者は問い合わせ一覧を新しい順で取得できる", async () => {
    const t = convexTest(schema, modules);
    await setupAdmin(t);
    await setupNormalUser(t);

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      const user = users.find((u) => u.clerkId === "user_clerk_id");
      if (!user) throw new Error("user not found");
      await ctx.db.insert("inquiries", {
        userId: user._id,
        category: "feature_request",
        body: "古い方",
        createdAt: now - 1000,
      });
      await ctx.db.insert("inquiries", {
        userId: user._id,
        category: "bug_report",
        body: "新しい方",
        createdAt: now,
      });
      // 7日より前は一覧に含まれない
      await ctx.db.insert("inquiries", {
        userId: user._id,
        category: "other",
        body: "8日前の問い合わせ",
        createdAt: now - 8 * oneDay,
      });
    });

    const inquiries = await t
      .withIdentity(adminIdentity)
      .query(api.admin.getInquiries, {});

    expect(inquiries).toHaveLength(2);
    expect(inquiries[0].body).toBe("新しい方");
    expect(inquiries[0].category).toBe("bug_report");
    expect(inquiries[0].displayName).toBe("一般ユーザー");
    expect(inquiries[1].body).toBe("古い方");
  });

  test("非管理者は取得できない", async () => {
    const t = convexTest(schema, modules);
    await setupNormalUser(t);

    await expect(
      t.withIdentity(userIdentity).query(api.admin.getInquiries, {}),
    ).rejects.toThrow("管理者権限が必要です");
  });
});

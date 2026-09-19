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
      expect(summary.trialClaimedCount).toBe(0);
    });

    test("trial claim 数をカウントできる", async () => {
      const t = convexTest(schema, modules);
      await setupAdmin(t);

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      await t.withIdentity(userIdentity).mutation(api.users.ensureUser, {});
      await t
        .withIdentity({ subject: "expired_user", email: "e@example.com" })
        .mutation(api.users.ensureUser, {});

      await t.run(async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const active = users.find((u) => u.clerkId === "user_clerk_id");
        const expired = users.find((u) => u.clerkId === "expired_user");
        if (active)
          await ctx.db.patch(active._id, { trialExpiresAt: now + oneDay });
        if (expired)
          await ctx.db.patch(expired._id, { trialExpiresAt: now - oneDay });
      });

      const summary = await t
        .withIdentity(adminIdentity)
        .query(api.admin.getSummary, {});

      expect(summary.trialClaimedCount).toBe(2);
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

describe("clearExpiredTrials", () => {
  test("期限切れ trial のみ削除し、有効な trial は残す", async () => {
    const t = convexTest(schema, modules);
    await setupAdmin(t);
    await setupNormalUser(t);

    const now = Date.now();
    await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      for (const u of users) {
        await ctx.db.patch(u._id, {
          trialExpiresAt:
            u.clerkId === "admin_clerk_id" ? now - 1000 : now + 1000000,
        });
      }
    });

    const result = await t.mutation(internal.admin.clearExpiredTrials, {});
    expect(result.cleared).toBe(1);

    const users = await t.run(async (ctx) => ctx.db.query("users").collect());
    const expired = users.find((u) => u.clerkId === "admin_clerk_id");
    const active = users.find((u) => u.clerkId === "user_clerk_id");
    expect(expired?.trialExpiresAt).toBeUndefined();
    expect(active?.trialExpiresAt).toBeDefined();
  });

  test("trial 未取得ユーザーがいても何もしない", async () => {
    const t = convexTest(schema, modules);
    await setupNormalUser(t);

    const result = await t.mutation(internal.admin.clearExpiredTrials, {});
    expect(result.cleared).toBe(0);
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

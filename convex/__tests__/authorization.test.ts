import { convexTest } from "convex-test";
import { describe, test, expect, vi } from "vitest";
import schema from "../schema";
import {
  getGroupMembership,
  requireGroupMember,
  requireGroupOwner,
  requireUserIsGroupMember,
} from "../lib/authorization";
import type { AuthQueryCtx } from "../lib/auth";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

describe("authorization ヘルパー関数", () => {
  describe("getGroupMembership", () => {
    test("メンバーの場合はメンバーシップを返す", async () => {
      const t = convexTest(schema, modules);

      // ユーザーとグループを作成
      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "owner",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      // メンバーシップを取得
      const membership = await t.run(async (ctx) => {
        const user = await ctx.db.get(userId);
        const mockCtx = {
          ...ctx,
          user: user!,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            audit: vi.fn(),
          },
        } as unknown as AuthQueryCtx;

        return await getGroupMembership(mockCtx, groupId);
      });

      expect(membership).not.toBeNull();
      expect(membership?.role).toBe("owner");
    });

    test("メンバーでない場合はnullを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // メンバーシップは作成しない

        return { userId, groupId };
      });

      const membership = await t.run(async (ctx) => {
        const user = await ctx.db.get(userId);
        const mockCtx = {
          ...ctx,
          user: user!,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            audit: vi.fn(),
          },
        } as unknown as AuthQueryCtx;

        return await getGroupMembership(mockCtx, groupId);
      });

      expect(membership).toBeNull();
    });
  });

  describe("requireGroupMember", () => {
    test("メンバーの場合はメンバーシップを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "member",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const membership = await t.run(async (ctx) => {
        const user = await ctx.db.get(userId);
        const mockCtx = {
          ...ctx,
          user: user!,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            audit: vi.fn(),
          },
        } as unknown as AuthQueryCtx;

        return await requireGroupMember(mockCtx, groupId);
      });

      expect(membership).not.toBeNull();
      expect(membership.role).toBe("member");
    });

    test("メンバーでない場合はエラーをスロー", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.get(userId);
          const mockCtx = {
            ...ctx,
            user: user!,
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              audit: vi.fn(),
            },
          } as unknown as AuthQueryCtx;

          return await requireGroupMember(mockCtx, groupId);
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("requireGroupOwner", () => {
    test("オーナーの場合はメンバーシップを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "owner",
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      const membership = await t.run(async (ctx) => {
        const user = await ctx.db.get(userId);
        const mockCtx = {
          ...ctx,
          user: user!,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            audit: vi.fn(),
          },
        } as unknown as AuthQueryCtx;

        return await requireGroupOwner(mockCtx, groupId);
      });

      expect(membership).not.toBeNull();
      expect(membership.role).toBe("owner");
    });

    test("メンバーだがオーナーでない場合はエラーをスロー", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId,
          role: "member", // オーナーではない
          joinedAt: Date.now(),
        });

        return { userId, groupId };
      });

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.get(userId);
          const mockCtx = {
            ...ctx,
            user: user!,
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              audit: vi.fn(),
            },
          } as unknown as AuthQueryCtx;

          return await requireGroupOwner(mockCtx, groupId);
        }),
      ).rejects.toThrow("この操作にはオーナー権限が必要です");
    });

    test("メンバーでない場合はエラーをスロー", async () => {
      const t = convexTest(schema, modules);

      const { userId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, groupId };
      });

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.get(userId);
          const mockCtx = {
            ...ctx,
            user: user!,
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              audit: vi.fn(),
            },
          } as unknown as AuthQueryCtx;

          return await requireGroupOwner(mockCtx, groupId);
        }),
      ).rejects.toThrow("このグループにアクセスする権限がありません");
    });
  });

  describe("requireUserIsGroupMember", () => {
    test("指定ユーザーがメンバーの場合はメンバーシップを返す", async () => {
      const t = convexTest(schema, modules);

      const { userId, targetUserId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const targetUserId = await ctx.db.insert("users", {
          clerkId: "target_clerk_id",
          displayName: "ターゲットユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await ctx.db.insert("groupMembers", {
          groupId,
          userId: targetUserId,
          role: "member",
          joinedAt: Date.now(),
        });

        return { userId, targetUserId, groupId };
      });

      const membership = await t.run(async (ctx) => {
        const user = await ctx.db.get(userId);
        const mockCtx = {
          ...ctx,
          user: user!,
          logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            audit: vi.fn(),
          },
        } as unknown as AuthQueryCtx;

        return await requireUserIsGroupMember(mockCtx, groupId, targetUserId);
      });

      expect(membership).not.toBeNull();
    });

    test("指定ユーザーがメンバーでない場合はエラーをスロー", async () => {
      const t = convexTest(schema, modules);

      const { userId, targetUserId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const targetUserId = await ctx.db.insert("users", {
          clerkId: "target_clerk_id",
          displayName: "ターゲットユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // ターゲットユーザーはメンバーではない

        return { userId, targetUserId, groupId };
      });

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.get(userId);
          const mockCtx = {
            ...ctx,
            user: user!,
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              audit: vi.fn(),
            },
          } as unknown as AuthQueryCtx;

          return await requireUserIsGroupMember(mockCtx, groupId, targetUserId);
        }),
      ).rejects.toThrow("指定されたユーザーはグループメンバーではありません");
    });

    test("カスタムエラーメッセージを使用できる", async () => {
      const t = convexTest(schema, modules);

      const { userId, targetUserId, groupId } = await t.run(async (ctx) => {
        const userId = await ctx.db.insert("users", {
          clerkId: "test_clerk_id",
          displayName: "テストユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const targetUserId = await ctx.db.insert("users", {
          clerkId: "target_clerk_id",
          displayName: "ターゲットユーザー",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        const groupId = await ctx.db.insert("groups", {
          name: "テストグループ",
          closingDay: 25,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        return { userId, targetUserId, groupId };
      });

      await expect(
        t.run(async (ctx) => {
          const user = await ctx.db.get(userId);
          const mockCtx = {
            ...ctx,
            user: user!,
            logger: {
              info: vi.fn(),
              warn: vi.fn(),
              error: vi.fn(),
              audit: vi.fn(),
            },
          } as unknown as AuthQueryCtx;

          return await requireUserIsGroupMember(
            mockCtx,
            groupId,
            targetUserId,
            "支払者がグループメンバーではありません",
          );
        }),
      ).rejects.toThrow("支払者がグループメンバーではありません");
    });
  });
});

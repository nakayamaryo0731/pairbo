import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob<Record<string, unknown>>("../**/*.ts");

// テスト用のユーザー認証情報
const ownerIdentity = {
  subject: "test_owner_user",
  name: "グループオーナー",
  email: "owner@example.com",
};

const inviteeIdentity = {
  subject: "test_invitee_user",
  name: "招待されたユーザー",
  email: "invitee@example.com",
};

describe("invitations", () => {
  describe("getByToken", () => {
    test("有効なトークンでグループ情報を取得できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      const result = await t.query(api.invitations.getByToken, { token });

      expect(result).not.toHaveProperty("error");
      expect(result).toHaveProperty("invitation");
      if ("invitation" in result && result.invitation) {
        expect(result.invitation.groupId).toBe(groupId);
        expect(result.invitation.groupName).toBe("テストグループ");
        expect(result.invitation.inviterName).toBe("グループオーナー");
        expect(result.invitation.memberCount).toBe(1);
      }
    });

    test("無効なトークンではエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const result = await t.query(api.invitations.getByToken, {
        token: "invalid-token",
      });

      expect(result).toHaveProperty("error", "invalid_token");
    });

    test("期限切れトークンではエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("groupInvitations")
          .withIndex("by_token", (q) => q.eq("token", token))
          .unique();
        if (invitation) {
          await ctx.db.patch(invitation._id, {
            expiresAt: Date.now() - 1000, // 過去に設定
          });
        }
      });

      const result = await t.query(api.invitations.getByToken, { token });

      expect(result).toHaveProperty("error", "expired");
    });

    test("使用済みトークンではエラーを返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("groupInvitations")
          .withIndex("by_token", (q) => q.eq("token", token))
          .unique();
        if (invitation) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) =>
              q.eq("clerkId", ownerIdentity.subject),
            )
            .unique();
          await ctx.db.patch(invitation._id, {
            usedAt: Date.now(),
            usedBy: user!._id,
          });
        }
      });

      const result = await t.query(api.invitations.getByToken, { token });

      expect(result).toHaveProperty("error", "already_used");
    });
  });

  describe("accept", () => {
    test("招待を受け入れてグループに参加できる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      const result = await t
        .withIdentity(inviteeIdentity)
        .mutation(api.invitations.accept, { token });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("groupId", groupId);

      const invitee = await t.run(async (ctx) => {
        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", inviteeIdentity.subject),
          )
          .unique();
      });

      const membership = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupMembers")
          .withIndex("by_group_and_user", (q) =>
            q.eq("groupId", groupId).eq("userId", invitee!._id),
          )
          .unique();
      });

      expect(membership).not.toBeNull();
      expect(membership?.role).toBe("member");
    });

    test("招待を受け入れるとトークンが使用済みになる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(inviteeIdentity)
        .mutation(api.invitations.accept, { token });

      const invitation = await t.run(async (ctx) => {
        return await ctx.db
          .query("groupInvitations")
          .withIndex("by_token", (q) => q.eq("token", token))
          .unique();
      });

      expect(invitation?.usedAt).toBeDefined();
      expect(invitation?.usedBy).toBeDefined();
    });

    test("既にメンバーの場合は alreadyMember を返す", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      const result = await t
        .withIdentity(ownerIdentity)
        .mutation(api.invitations.accept, { token });

      expect(result).toHaveProperty("alreadyMember", true);
      expect(result).toHaveProperty("groupId", groupId);
    });

    test("無効なトークンではエラーになる", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t
          .withIdentity(inviteeIdentity)
          .mutation(api.invitations.accept, { token: "invalid-token" }),
      ).rejects.toThrow("無効な招待リンクです");
    });

    test("期限切れトークンではエラーになる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("groupInvitations")
          .withIndex("by_token", (q) => q.eq("token", token))
          .unique();
        if (invitation) {
          await ctx.db.patch(invitation._id, {
            expiresAt: Date.now() - 1000,
          });
        }
      });

      await expect(
        t
          .withIdentity(inviteeIdentity)
          .mutation(api.invitations.accept, { token }),
      ).rejects.toThrow("招待リンクの有効期限が切れています");
    });

    test("使用済みトークンではエラーになる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await t
        .withIdentity(inviteeIdentity)
        .mutation(api.invitations.accept, { token });

      const secondInvitee = {
        subject: "second_invitee",
        name: "2人目の招待者",
        email: "second@example.com",
      };

      await expect(
        t
          .withIdentity(secondInvitee)
          .mutation(api.invitations.accept, { token }),
      ).rejects.toThrow("この招待リンクは既に使用されています");
    });

    test("認証なしではエラーになる", async () => {
      const t = convexTest(schema, modules);

      const groupId = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.create, {
          name: "テストグループ",
        });

      const { token } = await t
        .withIdentity(ownerIdentity)
        .mutation(api.groups.createInvitation, { groupId });

      await expect(
        t.mutation(api.invitations.accept, { token }),
      ).rejects.toThrow();
    });
  });
});

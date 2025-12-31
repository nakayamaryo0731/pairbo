import { v } from "convex/values";
import { query } from "./_generated/server";
import { authMutation } from "./lib/auth";
import { getGroupMemberIds } from "./lib/groupHelper";
import { FALLBACK } from "./lib/enrichment";
import {
  isInvitationExpired,
  isInvitationUsed,
  getInvitationErrorMessage,
} from "./domain/invitation";

/**
 * トークンで招待情報を取得（認証不要）
 * 未ログインでもグループ情報を表示するため
 */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      return { error: "invalid_token" as const };
    }

    if (isInvitationExpired(invitation.expiresAt)) {
      return { error: "expired" as const };
    }

    if (isInvitationUsed(invitation.usedAt)) {
      return { error: "already_used" as const };
    }

    const group = await ctx.db.get(invitation.groupId);
    if (!group) {
      return { error: "invalid_token" as const };
    }

    const inviter = await ctx.db.get(invitation.createdBy);
    const memberIds = await getGroupMemberIds(ctx, invitation.groupId);
    const memberCount = memberIds.length;

    return {
      invitation: {
        groupId: invitation.groupId,
        groupName: group.name,
        inviterName: inviter?.displayName ?? FALLBACK.USER_NAME,
        memberCount,
        expiresAt: invitation.expiresAt,
      },
    };
  },
});

/**
 * 招待を受け入れてグループに参加
 */
export const accept = authMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invitation) {
      ctx.logger.warn("GROUP", "invitation_accept_failed", {
        reason: "invalid_token",
      });
      throw new Error(getInvitationErrorMessage("invalid_token"));
    }

    if (isInvitationExpired(invitation.expiresAt)) {
      ctx.logger.warn("GROUP", "invitation_accept_failed", {
        reason: "expired",
        groupId: invitation.groupId,
      });
      throw new Error(getInvitationErrorMessage("expired"));
    }

    if (isInvitationUsed(invitation.usedAt)) {
      ctx.logger.warn("GROUP", "invitation_accept_failed", {
        reason: "already_used",
        groupId: invitation.groupId,
      });
      throw new Error(getInvitationErrorMessage("already_used"));
    }

    const existingMember = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", invitation.groupId).eq("userId", ctx.user._id),
      )
      .unique();

    if (existingMember) {
      ctx.logger.info("GROUP", "invitation_accept_already_member", {
        groupId: invitation.groupId,
      });
      return { alreadyMember: true, groupId: invitation.groupId };
    }

    await ctx.db.insert("groupMembers", {
      groupId: invitation.groupId,
      userId: ctx.user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    await ctx.db.patch(invitation._id, {
      usedAt: Date.now(),
      usedBy: ctx.user._id,
    });

    ctx.logger.audit("GROUP", "member_joined", {
      groupId: invitation.groupId,
      invitationId: invitation._id,
    });

    return { success: true, groupId: invitation.groupId };
  },
});

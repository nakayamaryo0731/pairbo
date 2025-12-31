import { ConvexError } from "convex/values";
import type { Id, Doc } from "../_generated/dataModel";
import type { AuthQueryCtx, AuthMutationCtx } from "./auth";

/**
 * グループメンバーシップの型
 */
export type GroupMembership = Doc<"groupMembers">;

/**
 * グループメンバーシップを取得
 * メンバーでない場合はnullを返す
 */
export async function getGroupMembership(
  ctx: AuthQueryCtx | AuthMutationCtx,
  groupId: Id<"groups">,
): Promise<GroupMembership | null> {
  return await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) =>
      q.eq("groupId", groupId).eq("userId", ctx.user._id),
    )
    .unique();
}

/**
 * グループメンバーであることを要求
 * メンバーでない場合はエラーをスロー
 */
export async function requireGroupMember(
  ctx: AuthQueryCtx | AuthMutationCtx,
  groupId: Id<"groups">,
): Promise<GroupMembership> {
  const membership = await getGroupMembership(ctx, groupId);

  if (!membership) {
    ctx.logger.warn("AUTH", "group_access_denied", { groupId });
    throw new ConvexError("このグループにアクセスする権限がありません");
  }

  return membership;
}

/**
 * グループオーナーであることを要求
 * オーナーでない場合はエラーをスロー
 */
export async function requireGroupOwner(
  ctx: AuthQueryCtx | AuthMutationCtx,
  groupId: Id<"groups">,
): Promise<GroupMembership> {
  const membership = await requireGroupMember(ctx, groupId);

  if (membership.role !== "owner") {
    ctx.logger.warn("AUTH", "owner_required", { groupId });
    throw new ConvexError("この操作にはオーナー権限が必要です");
  }

  return membership;
}

/**
 * 指定ユーザーがグループメンバーであることを確認
 * メンバーでない場合はエラーをスロー
 */
export async function requireUserIsGroupMember(
  ctx: AuthQueryCtx | AuthMutationCtx,
  groupId: Id<"groups">,
  userId: Id<"users">,
  errorMessage = "指定されたユーザーはグループメンバーではありません",
): Promise<GroupMembership> {
  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) =>
      q.eq("groupId", groupId).eq("userId", userId),
    )
    .unique();

  if (!membership) {
    throw new ConvexError(errorMessage);
  }

  return membership;
}

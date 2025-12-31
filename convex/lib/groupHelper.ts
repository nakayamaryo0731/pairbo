import type { DatabaseReader } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * グループの全メンバーIDを取得
 */
export async function getGroupMemberIds(
  ctx: { db: DatabaseReader },
  groupId: Id<"groups">,
): Promise<Id<"users">[]> {
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_group_and_user", (q) => q.eq("groupId", groupId))
    .collect();
  return memberships.map((m) => m.userId);
}

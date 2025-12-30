import {
  customQuery,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { query, mutation } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * 認証済みユーザーの型
 */
export type AuthUser = Doc<"users">;

/**
 * 認証済みコンテキストの型（Query用）
 */
export type AuthQueryCtx = QueryCtx & {
  user: AuthUser;
};

/**
 * 認証済みコンテキストの型（Mutation用）
 */
export type AuthMutationCtx = MutationCtx & {
  user: AuthUser;
};

/**
 * Clerkの認証情報からユーザーを取得する共通ヘルパー
 */
async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("認証が必要です");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return { identity, user };
}

/**
 * Query用の認証ミドルウェア
 *
 * ユーザーが存在しない場合はエラーを投げる（読み取り専用のため作成不可）
 */
const authQueryMiddleware = {
  args: {},
  input: async (
    ctx: QueryCtx,
    args: Record<string, unknown>,
  ): Promise<{
    ctx: AuthQueryCtx;
    args: Record<string, unknown>;
  }> => {
    const { user } = await getAuthenticatedUser(ctx);

    if (!user) {
      throw new ConvexError(
        "ユーザーが見つかりません。最初にログインしてください。",
      );
    }

    return { ctx: { ...ctx, user }, args };
  },
};

/**
 * Mutation用の認証ミドルウェア
 *
 * ユーザーが存在しない場合は自動作成（初回ログイン時）
 */
const authMutationMiddleware = {
  args: {},
  input: async (
    ctx: MutationCtx,
    args: Record<string, unknown>,
  ): Promise<{
    ctx: AuthMutationCtx;
    args: Record<string, unknown>;
  }> => {
    const { identity, user: existingUser } = await getAuthenticatedUser(ctx);

    let user = existingUser;

    // 初回ログイン時: ユーザーを自動作成
    if (!user) {
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        displayName: identity.name ?? identity.email ?? "名無し",
        avatarUrl: identity.pictureUrl,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new ConvexError("ユーザーの作成に失敗しました");
    }

    return { ctx: { ...ctx, user }, args };
  },
};

/**
 * 認証必須のQuery
 *
 * 注意: 初回ログイン時はユーザーが存在しないためエラーになる。
 * 最初にMutation（authMutation）を呼び出してユーザーを作成する必要がある。
 *
 * @example
 * export const myQuery = authQuery({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const { user } = ctx; // 認証済みユーザー
 *     // ...
 *   },
 * });
 */
export const authQuery = customQuery(query, authQueryMiddleware);

/**
 * 認証必須のMutation
 *
 * 初回ログイン時はユーザーを自動作成する。
 *
 * @example
 * export const myMutation = authMutation({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     const { user } = ctx; // 認証済みユーザー
 *     // ...
 *   },
 * });
 */
export const authMutation = customMutation(mutation, authMutationMiddleware);

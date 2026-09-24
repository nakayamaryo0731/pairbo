import {
  customQuery,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { query, mutation } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Logger } from "./logger";

/**
 * 認証済みユーザーの型
 */
export type AuthUser = Doc<"users">;

/**
 * 認証済みコンテキストの型（Query用）
 */
export type AuthQueryCtx = QueryCtx & {
  user: AuthUser;
  logger: Logger;
};

/**
 * 認証済みコンテキストの型（Mutation用）
 */
export type AuthMutationCtx = MutationCtx & {
  user: AuthUser;
  logger: Logger;
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
 * 認証済みだがユーザーレコードが未作成の可能性があるコンテキストの型（Query用）
 */
export type OptionalAuthQueryCtx = QueryCtx & {
  user: AuthUser | null;
  logger: Logger;
};

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

    const logger = new Logger(user._id);
    return { ctx: { ...ctx, user, logger }, args };
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
      user = await ctx.db.get("users", userId);
    }

    if (!user) {
      throw new ConvexError("ユーザーの作成に失敗しました");
    }

    const logger = new Logger(user._id);
    return { ctx: { ...ctx, user, logger }, args };
  },
};

/**
 * Query用の認証ミドルウェア（ユーザー未作成を許容）
 *
 * Clerk認証は必須だが、usersレコードが未作成の場合は user: null でhandlerに渡す。
 * 初回サインイン直後（ensureUser完了前）でも呼び出せるクエリに使う。
 */
const optionalAuthQueryMiddleware = {
  args: {},
  input: async (
    ctx: QueryCtx,
    args: Record<string, unknown>,
  ): Promise<{
    ctx: OptionalAuthQueryCtx;
    args: Record<string, unknown>;
  }> => {
    const { user } = await getAuthenticatedUser(ctx);
    const logger = new Logger(user?._id);
    return { ctx: { ...ctx, user, logger }, args };
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
 * 認証必須だがユーザー未作成を許容するQuery
 *
 * ctx.user が null の場合のフォールバック値をhandler側で返すこと。
 */
export const optionalAuthQuery = customQuery(
  query,
  optionalAuthQueryMiddleware,
);

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

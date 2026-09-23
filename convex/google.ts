import { v, ConvexError } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { authQuery } from "./lib/auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  GoogleTokenInvalidError,
} from "./lib/googleAuth";
import { createSpreadsheetWithSheets } from "./lib/sheetsClient";
import {
  buildExpenseSheetRows,
  type ExportExpenseRow,
} from "./lib/exportHelper";
import { canExportData } from "./lib/subscription";
import { getOrThrow } from "./lib/dataHelpers";
import {
  createUserMap,
  createCategoryMap,
  extendUserMap,
  FALLBACK,
} from "./lib/enrichment";
import { getSettlementPeriod } from "./domain/settlement";
import type { ClosingDay } from "./domain/group/types";
import { Logger } from "./lib/logger";

// アクセストークン更新の余裕時間（5分前なら refresh）
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// OAuth state の有効期間（10分）
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function generateState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ========================================
// Public Query: Google 連携状態取得
// ========================================

export const getConnection = authQuery({
  args: {},
  handler: async (ctx) => {
    const token = await ctx.db
      .query("googleSheetsTokens")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .unique();

    if (!token) {
      return { connected: false as const };
    }

    return {
      connected: true as const,
      connectedAt: token.createdAt,
      scope: token.scope,
    };
  },
});

// ========================================
// Public Action: OAuth URL生成
// ========================================

export const buildAuthUrl = action({
  args: {},
  handler: async (ctx): Promise<{ url: string; state: string }> => {
    const user = await ctx.runQuery(internal.google.getCurrentUser);
    if (!user) {
      throw new ConvexError("認証が必要です");
    }
    const state = generateState();
    await ctx.runMutation(internal.google.saveOAuthState, {
      userId: user._id,
      state,
      expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    });
    return { url: buildAuthorizationUrl(state), state };
  },
});

// ========================================
// Public Action: OAuth code 交換 + トークン保存
// ========================================

export const connect = action({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args): Promise<{ success: true }> => {
    const user = await ctx.runQuery(internal.google.getCurrentUser);
    if (!user) {
      throw new ConvexError("認証が必要です");
    }

    const logger = new Logger(user._id);

    const consumed = await ctx.runMutation(internal.google.consumeOAuthState, {
      state: args.state,
      userId: user._id,
    });
    if (!consumed) {
      // 攻撃検知シグナル: state が存在しない / 期限切れ / 別ユーザーの state
      logger.warn("GOOGLE", "oauth_state_invalid");
      throw new ConvexError(
        "OAuth state が無効です。もう一度連携をやり直してください。",
      );
    }

    const tokenResponse = await exchangeCodeForTokens(args.code);

    if (!tokenResponse.refresh_token) {
      throw new ConvexError(
        "refresh_tokenが取得できませんでした。一度Googleアカウント連携を解除して再認可してください。",
      );
    }

    const now = Date.now();
    await ctx.runMutation(internal.google.upsertToken, {
      userId: user._id,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: now + tokenResponse.expires_in * 1000,
      scope: tokenResponse.scope,
    });

    logger.audit("GOOGLE", "connected", { scope: tokenResponse.scope });

    return { success: true };
  },
});

// ========================================
// Public Action: 連携解除（Google 側も revoke）
// ========================================

export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<{ success: true }> => {
    const user = await ctx.runQuery(internal.google.getCurrentUser);
    if (!user) {
      throw new ConvexError("認証が必要です");
    }

    const token = await ctx.runQuery(internal.google.getTokenByUser, {
      userId: user._id,
    });

    if (token) {
      // Google 側で revoke（失敗してもDBは削除する）
      await revokeToken(token.refreshToken);
      await ctx.runMutation(internal.google.deleteTokenByUser, {
        userId: user._id,
      });
      new Logger(user._id).audit("GOOGLE", "disconnected");
    }

    return { success: true };
  },
});

// ========================================
// Public Action: エクスポート実行
// ========================================

type ExportPeriod =
  | { type: "all" }
  | { type: "year"; year: number }
  | { type: "settlement"; year: number; month: number };

const exportPeriodValidator = v.union(
  v.object({ type: v.literal("all") }),
  v.object({ type: v.literal("year"), year: v.number() }),
  v.object({
    type: v.literal("settlement"),
    year: v.number(),
    month: v.number(),
  }),
);

export const exportGroup = action({
  args: {
    groupId: v.id("groups"),
    period: exportPeriodValidator,
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ spreadsheetUrl: string; spreadsheetId: string }> => {
    const data = await ctx.runQuery(internal.google.collectExportData, {
      groupId: args.groupId,
      period: args.period,
    });

    const accessToken = await ensureAccessToken(ctx, data.userId);

    const expenseRows = buildExpenseSheetRows(data.expenses, data.members);

    const result = await createSpreadsheetWithSheets({
      accessToken,
      title: data.title,
      tabs: [{ title: "支出", rows: expenseRows }],
    });

    new Logger(data.userId).audit("GOOGLE", "exported", {
      groupId: args.groupId,
      period: args.period,
      spreadsheetId: result.spreadsheetId,
    });

    return result;
  },
});

async function ensureAccessToken(
  ctx: ActionCtx,
  userId: Id<"users">,
): Promise<string> {
  const token = await ctx.runQuery(internal.google.getTokenByUser, { userId });
  if (!token) {
    throw new ConvexError(
      "Googleアカウントが連携されていません。先に連携を行ってください。",
    );
  }

  // トークンがまだ有効なら使い回し
  if (token.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return token.accessToken;
  }

  // 期限切れ間近 → refresh
  try {
    const refreshed = await refreshAccessToken(token.refreshToken);
    const now = Date.now();
    await ctx.runMutation(internal.google.upsertToken, {
      userId,
      accessToken: refreshed.access_token,
      // refresh時にrefresh_tokenを返さないことが多いので既存のものをフォールバックに
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: now + refreshed.expires_in * 1000,
      scope: refreshed.scope ?? token.scope,
    });
    return refreshed.access_token;
  } catch (e) {
    if (e instanceof GoogleTokenInvalidError) {
      // Google 側で revoke されていた → DBから削除して再連携を促す
      new Logger(userId).warn("GOOGLE", "token_revoked_by_google");
      await ctx.runMutation(internal.google.deleteTokenByUser, { userId });
      throw new ConvexError(
        "Googleの連携が無効になりました。再度連携を行ってください。",
      );
    }
    throw e;
  }
}

// ========================================
// Internal queries / mutations
// ========================================

export const getCurrentUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getTokenByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleSheetsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const upsertToken = internalMutation({
  args: {
    userId: v.id("users"),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("googleSheetsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch("googleSheetsTokens", existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("googleSheetsTokens", {
      userId: args.userId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteTokenByUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query("googleSheetsTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (token) {
      await ctx.db.delete("googleSheetsTokens", token._id);
    }
  },
});

export const saveOAuthState = internalMutation({
  args: {
    userId: v.id("users"),
    state: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // 同一ユーザーの古い state を掃除（連打や中断のたびに増えるのを防ぐ）
    const now = Date.now();
    const existing = await ctx.db
      .query("googleOAuthStates")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of existing) {
      if (s.expiresAt < now) {
        await ctx.db.delete("googleOAuthStates", s._id);
      }
    }
    await ctx.db.insert("googleOAuthStates", {
      state: args.state,
      userId: args.userId,
      expiresAt: args.expiresAt,
    });
  },
});

export const consumeOAuthState = internalMutation({
  args: { state: v.string(), userId: v.id("users") },
  handler: async (ctx, args): Promise<boolean> => {
    const record = await ctx.db
      .query("googleOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique();
    if (!record) return false;
    // 必ず削除（成否にかかわらず再利用させない）
    await ctx.db.delete("googleOAuthStates", record._id);
    if (record.userId !== args.userId) return false;
    if (record.expiresAt < Date.now()) return false;
    return true;
  },
});

export const collectExportData = internalQuery({
  args: {
    groupId: v.id("groups"),
    period: exportPeriodValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("認証が必要です");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      throw new ConvexError("ユーザーが見つかりません");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();
    if (!membership) {
      throw new ConvexError("このグループにアクセスする権限がありません");
    }

    const canExport = await canExportData(ctx, args.groupId);
    if (!canExport) {
      throw new ConvexError(
        "エクスポート機能はPremiumプランでご利用いただけます",
      );
    }

    const group = await getOrThrow(
      ctx,
      args.groupId,
      "グループが見つかりません",
    );

    // joinedAt 昇順で列順序を安定させる
    const groupMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();
    const memberDocs = await Promise.all(
      groupMembers
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((m) => ctx.db.get("users", m.userId)),
    );
    const members = memberDocs
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => ({ userId: u._id, displayName: u.displayName }));

    const period = resolvePeriod(args.period, group.closingDay);

    // 期間指定がある場合は by_group_and_date インデックスの範囲スキャン
    const expenses = (
      await (period
        ? ctx.db
            .query("expenses")
            .withIndex("by_group_and_date", (q) =>
              q
                .eq("groupId", args.groupId)
                .gte("date", period.startDate)
                .lte("date", period.endDate),
            )
            .collect()
        : ctx.db
            .query("expenses")
            .withIndex("by_group_and_date", (q) =>
              q.eq("groupId", args.groupId),
            )
            .collect())
    ).sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a._creationTime - b._creationTime,
    );

    const categoryMap = await createCategoryMap(
      ctx,
      expenses.map((e) => e.categoryId),
    );
    const userMap = await createUserMap(ctx, [
      ...members.map((m) => m.userId),
      ...expenses.map((e) => e.paidBy),
    ]);

    const [allSplits, allExpenseTags] = await Promise.all([
      Promise.all(
        expenses.map((e) =>
          ctx.db
            .query("expenseSplits")
            .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
            .collect(),
        ),
      ),
      Promise.all(
        expenses.map((e) =>
          ctx.db
            .query("expenseTags")
            .withIndex("by_expense", (q) => q.eq("expenseId", e._id))
            .collect(),
        ),
      ),
    ]);

    await extendUserMap(
      ctx,
      userMap,
      allSplits.flat().map((s) => s.userId),
    );

    // タグ情報を一括取得
    const allTagIds = [...new Set(allExpenseTags.flat().map((et) => et.tagId))];
    const tagDocs = await Promise.all(
      allTagIds.map((id) => ctx.db.get("tags", id)),
    );
    const tagMap = new Map(
      tagDocs
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map((t) => [t._id, t.name]),
    );

    const expenseRows: ExportExpenseRow[] = expenses.map((e, i) => {
      const splitsByUser = new Map<string, number>();
      for (const s of allSplits[i]) {
        splitsByUser.set(s.userId, s.amount);
      }
      const tagNames = allExpenseTags[i]
        .map((et) => tagMap.get(et.tagId))
        .filter((n): n is string => n !== undefined);
      return {
        date: e.date,
        title: e.title ?? "",
        category: categoryMap.get(e.categoryId)?.name ?? FALLBACK.CATEGORY_NAME,
        amount: e.amount,
        payer: userMap.get(e.paidBy)?.displayName ?? FALLBACK.USER_NAME,
        splitMethod: e.splitMethod,
        memo: e.memo ?? "",
        memberAmounts: members.map((m) => splitsByUser.get(m.userId) ?? 0),
        tags: tagNames,
      };
    });

    return {
      userId: user._id,
      title: buildSheetTitle(group.name, args.period),
      members,
      expenses: expenseRows,
    };
  },
});

export function resolvePeriod(
  period: ExportPeriod,
  closingDay: ClosingDay,
): { startDate: string; endDate: string } | null {
  if (period.type === "all") return null;
  if (period.type === "year") {
    return {
      startDate: `${period.year}-01-01`,
      endDate: `${period.year}-12-31`,
    };
  }
  const p = getSettlementPeriod(closingDay, period.year, period.month);
  return { startDate: p.startDate, endDate: p.endDate };
}

export function buildSheetTitle(
  groupName: string,
  period: ExportPeriod,
): string {
  const periodLabel =
    period.type === "all"
      ? "全期間"
      : period.type === "year"
        ? `${period.year}年`
        : `${period.year}年${period.month}月`;
  return `Pairbo - ${groupName} - ${periodLabel}`;
}

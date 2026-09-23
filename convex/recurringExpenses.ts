import { v, ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { authMutation, authQuery, type AuthMutationCtx } from "./lib/auth";
import {
  requireGroupMember,
  requireUserIsGroupMember,
} from "./lib/authorization";
import { getOrThrow } from "./lib/dataHelpers";
import { getGroupMemberIds } from "./lib/groupHelper";
import { isGroupPremium } from "./lib/subscription";
import { splitDetailsValidator } from "./lib/validators";
import { Logger } from "./lib/logger";
import {
  calculateSplits,
  validateSplitDetails,
  validateAmount,
  resolveTargetMemberIds,
  type SplitDetails,
} from "./domain/expense";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const RECURRING_EXPENSE_LIMITS = {
  MAX_PER_GROUP: 20,
  MIN_DAY: 1,
  MAX_DAY: 28,
} as const;

/** JSTの今日の日付を YYYY-MM-DD で返す */
export function getTodayJst(now = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export type RecurringTemplateInput = {
  groupId: Id<"groups">;
  amount: number;
  categoryId: Id<"categories">;
  paidBy: Id<"users">;
  dayOfMonth: number;
  title: string;
  splitDetails: SplitDetails;
};

function validateTemplateInput(args: {
  amount: number;
  dayOfMonth: number;
  title: string;
}) {
  if (
    !Number.isInteger(args.dayOfMonth) ||
    args.dayOfMonth < RECURRING_EXPENSE_LIMITS.MIN_DAY ||
    args.dayOfMonth > RECURRING_EXPENSE_LIMITS.MAX_DAY
  ) {
    throw new ConvexError("実行日は1〜28日の範囲で指定してください");
  }

  const title = args.title.trim();
  if (!title) {
    throw new ConvexError("タイトルを入力してください");
  }

  validateAmount(args.amount);

  return title;
}

async function validateTemplateRelations(
  ctx: AuthMutationCtx,
  args: RecurringTemplateInput,
) {
  const category = await ctx.db.get("categories", args.categoryId);
  if (!category || category.groupId !== args.groupId) {
    throw new ConvexError("カテゴリが見つかりません");
  }

  await requireUserIsGroupMember(
    ctx,
    args.groupId,
    args.paidBy,
    "支払者がグループメンバーではありません",
  );

  const allMemberIds = await getGroupMemberIds(ctx, args.groupId);
  const targetMemberIds = resolveTargetMemberIds(
    args.splitDetails,
    allMemberIds,
  );
  // resolveTargetMemberIds はratio/amount/fullのメンバー所属を検証しないため、ここで検証する
  if (targetMemberIds.some((id) => !allMemberIds.includes(id))) {
    throw new ConvexError("分割対象メンバーがグループに所属していません");
  }
  validateSplitDetails(args.splitDetails, args.amount, targetMemberIds);
}

/**
 * テンプレート作成の共通処理（設定画面・支出フォームの両方から使う）
 * lastGeneratedMonth を指定すると、その月の自動生成をスキップする
 */
export async function insertRecurringTemplate(
  ctx: AuthMutationCtx,
  args: RecurringTemplateInput & { lastGeneratedMonth?: string },
): Promise<Id<"recurringExpenses">> {
  const canUse = await isGroupPremium(ctx, args.groupId);
  if (!canUse) {
    throw new ConvexError("定期支出はPremiumプランでご利用いただけます");
  }

  const title = validateTemplateInput(args);
  await validateTemplateRelations(ctx, args);

  const existing = await ctx.db
    .query("recurringExpenses")
    .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
    .collect();
  if (existing.length >= RECURRING_EXPENSE_LIMITS.MAX_PER_GROUP) {
    throw new ConvexError(
      `定期支出は${RECURRING_EXPENSE_LIMITS.MAX_PER_GROUP}件まで登録できます`,
    );
  }

  const now = Date.now();
  const id = await ctx.db.insert("recurringExpenses", {
    groupId: args.groupId,
    amount: args.amount,
    categoryId: args.categoryId,
    paidBy: args.paidBy,
    dayOfMonth: args.dayOfMonth,
    title,
    splitDetails: args.splitDetails,
    lastGeneratedMonth: args.lastGeneratedMonth,
    createdBy: ctx.user._id,
    createdAt: now,
    updatedAt: now,
  });

  ctx.logger.audit("EXPENSE", "recurring_created", {
    recurringExpenseId: id,
    groupId: args.groupId,
    dayOfMonth: args.dayOfMonth,
  });

  return id;
}

/**
 * 定期支出テンプレート一覧
 */
export const list = authQuery({
  args: {
    groupId: v.id("groups"),
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);

    const templates = await ctx.db
      .query("recurringExpenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const memberIds = await getGroupMemberIds(ctx, args.groupId);

    const enriched = await Promise.all(
      templates.map(async (t) => {
        const category = await ctx.db.get("categories", t.categoryId);
        const payer = await ctx.db.get("users", t.paidBy);
        return {
          ...t,
          category: category
            ? { name: category.name, icon: category.icon }
            : null,
          payerName: payer?.displayName ?? "不明",
          // 支払者が脱退したテンプレートは生成に失敗するため、UI側で警告表示する
          payerLeft: !memberIds.includes(t.paidBy),
        };
      }),
    );

    return enriched.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  },
});

/**
 * 定期支出テンプレート作成（Premium・グループ単位）
 */
export const create = authMutation({
  args: {
    groupId: v.id("groups"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    dayOfMonth: v.number(),
    title: v.string(),
    splitDetails: splitDetailsValidator,
  },
  handler: async (ctx, args) => {
    await requireGroupMember(ctx, args.groupId);
    return insertRecurringTemplate(ctx, args);
  },
});

/**
 * 定期支出テンプレート更新
 */
export const update = authMutation({
  args: {
    recurringExpenseId: v.id("recurringExpenses"),
    amount: v.number(),
    categoryId: v.id("categories"),
    paidBy: v.id("users"),
    dayOfMonth: v.number(),
    title: v.string(),
    splitDetails: splitDetailsValidator,
  },
  handler: async (ctx, args) => {
    const template = await getOrThrow(
      ctx,
      args.recurringExpenseId,
      "定期支出が見つかりません",
    );
    await requireGroupMember(ctx, template.groupId);

    const canUse = await isGroupPremium(ctx, template.groupId);
    if (!canUse) {
      throw new ConvexError("定期支出はPremiumプランでご利用いただけます");
    }

    const title = validateTemplateInput(args);
    await validateTemplateRelations(ctx, {
      ...args,
      groupId: template.groupId,
    });

    await ctx.db.patch("recurringExpenses", args.recurringExpenseId, {
      amount: args.amount,
      categoryId: args.categoryId,
      paidBy: args.paidBy,
      dayOfMonth: args.dayOfMonth,
      title,
      splitDetails: args.splitDetails,
      updatedAt: Date.now(),
    });

    ctx.logger.audit("EXPENSE", "recurring_updated", {
      recurringExpenseId: args.recurringExpenseId,
      groupId: template.groupId,
    });
  },
});

/**
 * 定期支出テンプレート削除（作成済みの支出は残す）
 */
export const remove = authMutation({
  args: {
    recurringExpenseId: v.id("recurringExpenses"),
  },
  handler: async (ctx, args) => {
    const template = await getOrThrow(
      ctx,
      args.recurringExpenseId,
      "定期支出が見つかりません",
    );
    await requireGroupMember(ctx, template.groupId);

    await ctx.db.delete("recurringExpenses", args.recurringExpenseId);

    ctx.logger.audit("EXPENSE", "recurring_deleted", {
      recurringExpenseId: args.recurringExpenseId,
      groupId: template.groupId,
    });
  },
});

/**
 * 一時停止 / 再開
 */
export const setPaused = authMutation({
  args: {
    recurringExpenseId: v.id("recurringExpenses"),
    paused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const template = await getOrThrow(
      ctx,
      args.recurringExpenseId,
      "定期支出が見つかりません",
    );
    await requireGroupMember(ctx, template.groupId);

    await ctx.db.patch("recurringExpenses", args.recurringExpenseId, {
      pausedAt: args.paused ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * テンプレートから支出 + 分割を作成する共通処理
 * splitDetailsが現在のメンバー構成で無効な場合は均等割にフォールバックする
 */
async function createExpenseFromTemplate(
  ctx: MutationCtx,
  template: Doc<"recurringExpenses">,
  date: string,
): Promise<Id<"expenses">> {
  const allMemberIds = await getGroupMemberIds(ctx, template.groupId);
  const amount = template.amount;

  let splitDetails: SplitDetails = template.splitDetails;
  let splits;
  try {
    const targetMemberIds = resolveTargetMemberIds(splitDetails, allMemberIds);
    // resolveTargetMemberIds はratio/amount/fullのメンバー所属を検証しないため、
    // 脱退メンバーを参照するテンプレートはここで検出してフォールバックさせる
    if (targetMemberIds.some((id) => !allMemberIds.includes(id))) {
      throw new ConvexError("分割対象メンバーがグループに所属していません");
    }
    validateSplitDetails(splitDetails, amount, targetMemberIds);
    splits = calculateSplits(
      splitDetails,
      amount,
      targetMemberIds,
      template.paidBy,
    );
  } catch (error) {
    splitDetails = { method: "equal" };
    splits = calculateSplits(
      splitDetails,
      amount,
      allMemberIds,
      template.paidBy,
    );
    new Logger().warn("EXPENSE", "recurring_split_fallback", {
      recurringExpenseId: template._id,
      groupId: template.groupId,
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  const now = Date.now();
  const expenseId = await ctx.db.insert("expenses", {
    groupId: template.groupId,
    amount,
    categoryId: template.categoryId,
    paidBy: template.paidBy,
    date,
    title: template.title,
    splitMethod: splitDetails.method,
    recurringExpenseId: template._id,
    createdBy: template.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  await Promise.all(
    splits.map((split) =>
      ctx.db.insert("expenseSplits", {
        expenseId,
        userId: split.userId,
        amount: split.amount,
      }),
    ),
  );

  return expenseId;
}

/**
 * 日次cron: 当日実行分のテンプレートから支出を生成する
 * todayOverride はテスト用（YYYY-MM-DD）
 */
export const generateDue = internalMutation({
  args: {
    todayOverride: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logger = new Logger();
    const today = args.todayOverride ?? getTodayJst();
    const day = Number(today.slice(8, 10));
    const month = today.slice(0, 7);

    const templates = await ctx.db.query("recurringExpenses").collect();
    const due = templates.filter(
      (t) =>
        t.dayOfMonth === day &&
        t.pausedAt === undefined &&
        t.lastGeneratedMonth !== month,
    );

    let generated = 0;
    for (const template of due) {
      // 1テンプレートの失敗が当日の他テンプレートの生成を巻き添えにしないよう個別にcatchする
      try {
        const premium = await isGroupPremium(ctx, template.groupId);
        if (!premium) {
          // Freeに戻ったグループはスキップ（Premium復帰後の月から再開、遡及なし）
          continue;
        }

        const memberIds = await getGroupMemberIds(ctx, template.groupId);
        if (!memberIds.includes(template.paidBy)) {
          // 支払者が脱退したテンプレートは自動停止
          await ctx.db.patch("recurringExpenses", template._id, {
            pausedAt: Date.now(),
            updatedAt: Date.now(),
          });
          logger.warn("EXPENSE", "recurring_auto_paused", {
            recurringExpenseId: template._id,
            groupId: template.groupId,
          });
          continue;
        }

        const expenseId = await createExpenseFromTemplate(ctx, template, today);
        logger.info("EXPENSE", "recurring_generated", {
          recurringExpenseId: template._id,
          expenseId,
        });

        await ctx.db.patch("recurringExpenses", template._id, {
          lastGeneratedMonth: month,
          updatedAt: Date.now(),
        });
        generated++;
      } catch (error) {
        logger.error("EXPENSE", "recurring_generate_failed", {
          recurringExpenseId: template._id,
          groupId: template.groupId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (due.length > 0) {
      logger.info("EXPENSE", "recurring_cron_done", {
        date: today,
        dueCount: due.length,
        generatedCount: generated,
      });
    }
  },
});

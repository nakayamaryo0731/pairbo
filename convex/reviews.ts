import { v, ConvexError } from "convex/values";
import { authMutation, authQuery } from "./lib/auth";
import { getGroupMembership } from "./lib/authorization";
import {
  reviewAgeRangeValidator,
  reviewRelationshipValidator,
} from "./lib/validators";
import {
  REVIEW_RULES,
  ReviewValidationError,
  isReviewPromptEligible,
  validateReviewText,
} from "./domain/review";

/**
 * このグループで感想のお願いを出すか
 *
 * 補助的なバナーのため、メンバーでない場合もエラーにせず false を返す
 * （グループ削除・脱退の直後に画面ごと落ちないようにする）
 */
export const shouldShowPrompt = authQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    if (ctx.user.reviewPromptClosedAt != null) return false;
    if (!(await getGroupMembership(ctx, args.groupId))) return false;

    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) => q.eq("groupId", args.groupId))
      .collect();
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_and_date", (q) => q.eq("groupId", args.groupId))
      .take(REVIEW_RULES.MIN_EXPENSES);

    return isReviewPromptEligible(
      members.map((m) => m.joinedAt),
      expenses.length,
    );
  },
});

/**
 * 感想のお願いを閉じる（以後どのグループでも出さない）
 */
export const closePrompt = authMutation({
  args: {},
  handler: async (ctx) => {
    if (ctx.user.reviewPromptClosedAt != null) return;

    const now = Date.now();
    await ctx.db.patch("users", ctx.user._id, {
      reviewPromptClosedAt: now,
      updatedAt: now,
    });
    ctx.logger.info("REVIEW", "close_prompt");
  },
});

/**
 * 感想を送信する（1人1回まで）
 */
export const submit = authMutation({
  args: {
    relationship: reviewRelationshipValidator,
    ageRange: v.optional(reviewAgeRangeValidator),
    before: v.string(),
    change: v.string(),
    likes: v.optional(v.string()),
    improvements: v.optional(v.string()),
    publishConsent: v.boolean(),
  },
  handler: async (ctx, args) => {
    let text;
    try {
      text = validateReviewText(args);
    } catch (error) {
      if (error instanceof ReviewValidationError) {
        throw new ConvexError(error.message);
      }
      throw error;
    }

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .first();
    if (existing) {
      throw new ConvexError("感想はすでに送信済みです");
    }

    const now = Date.now();
    const reviewId = await ctx.db.insert("reviews", {
      userId: ctx.user._id,
      relationship: args.relationship,
      ageRange: args.ageRange,
      ...text,
      publishConsent: args.publishConsent,
      createdAt: now,
    });

    if (ctx.user.reviewPromptClosedAt == null) {
      await ctx.db.patch("users", ctx.user._id, {
        reviewPromptClosedAt: now,
        updatedAt: now,
      });
    }

    ctx.logger.info("REVIEW", "submit", {
      reviewId,
      publishConsent: args.publishConsent,
    });

    return reviewId;
  },
});

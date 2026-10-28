import { describe, expect, test } from "vitest";
import {
  isReviewPromptEligible,
  validateReviewText,
  ReviewValidationError,
  REVIEW_RULES,
} from "../domain/review";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 7);
const daysAgo = (days: number) => NOW - days * DAY_MS;

describe("review/rules", () => {
  describe("isReviewPromptEligible", () => {
    test("2人で30日以上・支出30件以上なら対象", () => {
      expect(isReviewPromptEligible([daysAgo(60), daysAgo(30)], 30, NOW)).toBe(
        true,
      );
    });

    test("メンバーが1人なら対象外", () => {
      expect(isReviewPromptEligible([daysAgo(365)], 100, NOW)).toBe(false);
    });

    test("2人目の参加から30日未満なら対象外", () => {
      expect(
        isReviewPromptEligible([daysAgo(365), daysAgo(29)], 100, NOW),
      ).toBe(false);
    });

    test("支出が30件未満なら対象外", () => {
      expect(isReviewPromptEligible([daysAgo(60), daysAgo(60)], 29, NOW)).toBe(
        false,
      );
    });

    test("3人以上のときは2番目に早い参加日で判定する", () => {
      // 3人目が最近参加しても、2人目から30日以上たっていれば対象
      expect(
        isReviewPromptEligible([daysAgo(1), daysAgo(90), daysAgo(40)], 30, NOW),
      ).toBe(true);
    });
  });

  describe("validateReviewText", () => {
    test("前後の空白を除き、空の任意項目はundefinedにする", () => {
      expect(
        validateReviewText({
          before: "  レシートで計算  ",
          change: "\n楽になった\n",
          likes: "   ",
          improvements: undefined,
        }),
      ).toEqual({
        before: "レシートで計算",
        change: "楽になった",
        likes: undefined,
        improvements: undefined,
      });
    });

    test("必須項目が空ならエラー", () => {
      expect(() =>
        validateReviewText({ before: " ", change: "楽になった" }),
      ).toThrow(ReviewValidationError);
      expect(() => validateReviewText({ before: "現金", change: "" })).toThrow(
        "Pairboを使って変わったことを入力してください",
      );
    });

    test("最大文字数ちょうどは通り、超えるとエラー", () => {
      const max = "あ".repeat(REVIEW_RULES.TEXT_MAX_LENGTH);
      expect(validateReviewText({ before: max, change: "x" }).before).toBe(max);
      expect(() =>
        validateReviewText({ before: "x", change: "x", likes: `${max}あ` }),
      ).toThrow(`${REVIEW_RULES.TEXT_MAX_LENGTH}文字以内`);
    });
  });
});

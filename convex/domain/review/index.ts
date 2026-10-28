/**
 * Review Domain
 *
 * 利用者の感想募集に関するビジネスロジック・ルール・型定義
 */

export { REVIEW_RULES, type ReviewTextInput } from "./types";

export {
  ReviewValidationError,
  isReviewPromptEligible,
  validateReviewText,
} from "./rules";

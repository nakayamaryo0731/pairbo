/**
 * Category Domain
 *
 * カテゴリに関するビジネスロジック・ルール・型定義
 */

export {
  CATEGORY_RULES,
  CATEGORY_ICON_NAMES,
  type CategoryIconName,
} from "./types";

export {
  CategoryValidationError,
  validateCategoryName,
  validateCategoryIcon,
  isValidCategoryIcon,
} from "./rules";

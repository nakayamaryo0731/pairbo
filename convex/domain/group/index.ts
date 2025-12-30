/**
 * Group Domain
 *
 * グループに関するビジネスロジック・ルール・型定義
 */

// Types
export { GROUP_RULES, type GroupInput, type MemberRole } from "./types";

// Rules
export {
  GroupValidationError,
  validateGroupName,
  validateGroupDescription,
  validateGroupInput,
  validateClosingDay,
} from "./rules";

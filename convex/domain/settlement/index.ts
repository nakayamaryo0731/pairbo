/**
 * Settlement Domain
 *
 * 精算に関するビジネスロジック・ルール・型定義
 */

// Types
export {
  SETTLEMENT_RULES,
  type SettlementStatus,
  type MemberBalance,
  type Payment,
  type SettlementPeriod,
  type SettlementPreview,
} from "./types";

// Calculator
export {
  calculateBalances,
  minimizeTransfers,
  getSettlementPeriod,
  isDateInPeriod,
  getSettlementLabel,
  getCurrentSettlementYearMonth,
} from "./calculator";

// Rules
export {
  SettlementValidationError,
  validateYear,
  validateMonth,
  validateClosingDay,
  validateSettlementPeriodInput,
} from "./rules";

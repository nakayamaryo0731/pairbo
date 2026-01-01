/**
 * 精算バリデーションエラー
 */
export class SettlementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementValidationError";
  }
}

/**
 * 年のバリデーション
 *
 * @param year 年
 * @throws {SettlementValidationError} バリデーションエラーの場合
 */
export function validateYear(year: number): void {
  if (!Number.isInteger(year)) {
    throw new SettlementValidationError("年は整数で入力してください");
  }

  if (year < 2000 || year > 2100) {
    throw new SettlementValidationError("年は2000〜2100の間で指定してください");
  }
}

/**
 * 月のバリデーション
 *
 * @param month 月
 * @throws {SettlementValidationError} バリデーションエラーの場合
 */
export function validateMonth(month: number): void {
  if (!Number.isInteger(month)) {
    throw new SettlementValidationError("月は整数で入力してください");
  }

  if (month < 1 || month > 12) {
    throw new SettlementValidationError("月は1〜12の間で指定してください");
  }
}

/**
 * 精算期間入力のバリデーション
 *
 * @param year 年
 * @param month 月
 * @throws {SettlementValidationError} バリデーションエラーの場合
 */
export function validateSettlementPeriodInput(
  year: number,
  month: number,
): void {
  validateYear(year);
  validateMonth(month);
}

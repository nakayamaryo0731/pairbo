import { GROUP_RULES, type GroupInput } from "./types";

/**
 * グループバリデーションエラー
 */
export class GroupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupValidationError";
  }
}

/**
 * グループ名のバリデーション
 *
 * @param name グループ名
 * @returns トリム後のグループ名
 * @throws {GroupValidationError} バリデーションエラーの場合
 */
export function validateGroupName(name: string): string {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new GroupValidationError("グループ名を入力してください");
  }

  if (trimmed.length > GROUP_RULES.MAX_NAME_LENGTH) {
    throw new GroupValidationError("グループ名は50文字以内で入力してください");
  }

  return trimmed;
}

/**
 * グループ説明のバリデーション
 *
 * @param description 説明文
 * @returns トリム後の説明文（undefinedの場合はundefined）
 * @throws {GroupValidationError} バリデーションエラーの場合
 */
export function validateGroupDescription(
  description: string | undefined,
): string | undefined {
  if (!description) {
    return undefined;
  }

  const trimmed = description.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > GROUP_RULES.MAX_DESCRIPTION_LENGTH) {
    throw new GroupValidationError("説明は200文字以内で入力してください");
  }

  return trimmed;
}

/**
 * グループ入力の全体バリデーション
 *
 * @returns バリデーション済みの入力データ
 * @throws {GroupValidationError} バリデーションエラーの場合
 */
export function validateGroupInput(input: GroupInput): {
  name: string;
  description?: string;
} {
  return {
    name: validateGroupName(input.name),
    description: validateGroupDescription(input.description),
  };
}

/**
 * 締め日のバリデーション
 *
 * @param closingDay 締め日
 * @throws {GroupValidationError} バリデーションエラーの場合
 */
export function validateClosingDay(closingDay: number): void {
  if (!Number.isInteger(closingDay)) {
    throw new GroupValidationError("締め日は整数で入力してください");
  }

  if (
    closingDay < GROUP_RULES.MIN_CLOSING_DAY ||
    closingDay > GROUP_RULES.MAX_CLOSING_DAY
  ) {
    throw new GroupValidationError("締め日は1〜28の間で設定してください");
  }
}

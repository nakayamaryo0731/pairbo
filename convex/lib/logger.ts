/**
 * 構造化ロガー
 *
 * JSON形式でログを出力し、将来のログストリーム連携に対応。
 * Convex Dashboard や CLI (npx convex logs) で検索・フィルタリングが容易。
 */

// ログトピック
export const LOG_TOPICS = {
  AUTH: "AUTH",
  GROUP: "GROUP",
  EXPENSE: "EXPENSE",
  SETTLEMENT: "SETTLEMENT",
  SHOPPING: "SHOPPING",
  CATEGORY: "CATEGORY",
  SYSTEM: "SYSTEM",
} as const;

export type LogTopic = (typeof LOG_TOPICS)[keyof typeof LOG_TOPICS];

// ログレベル
export const LOG_LEVELS = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  audit: "audit",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

// ログエントリの型
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  topic: LogTopic;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  message?: string;
}

/**
 * 構造化ロガークラス
 *
 * @example
 * const logger = new Logger(userId);
 * logger.info("GROUP", "create", { groupId }, "グループを作成しました");
 * logger.audit("SETTLEMENT", "complete", { settlementId, amount });
 * logger.error("EXPENSE", "create", { error: e.message }, "支出作成に失敗");
 */
export class Logger {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  private log(
    level: LogLevel,
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      topic,
      action,
      ...(this.userId && { userId: this.userId }),
      ...(metadata && { metadata }),
      ...(message && { message }),
    };

    // JSON形式で出力（将来のログストリーム対応）
    const output = JSON.stringify(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
      case "audit":
        // auditはinfo扱いだが、levelフィールドで区別可能
        console.info(output);
        break;
    }
  }

  /**
   * デバッグログ（開発時の詳細情報）
   */
  debug(
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    this.log("debug", topic, action, metadata, message);
  }

  /**
   * 情報ログ（通常の処理情報）
   */
  info(
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    this.log("info", topic, action, metadata, message);
  }

  /**
   * 警告ログ（処理は継続するが注意が必要）
   */
  warn(
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    this.log("warn", topic, action, metadata, message);
  }

  /**
   * エラーログ（処理失敗）
   */
  error(
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    this.log("error", topic, action, metadata, message);
  }

  /**
   * 監査ログ（重要操作の記録）
   *
   * セキュリティ上重要な操作（作成、削除、権限変更等）に使用
   */
  audit(
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string,
  ): void {
    this.log("audit", topic, action, metadata, message);
  }
}

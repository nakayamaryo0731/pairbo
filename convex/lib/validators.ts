import { v } from "convex/values";

/**
 * 負担方法
 * - equal: 均等分割（人数で等分、端数は支払者負担）
 * - ratio: 傾斜分割（割合指定、合計100%）
 * - amount: 傾斜分割（金額指定、合計=支出額）
 * - full: 全額負担（指定した1人が全額負担）
 */
export const splitMethodValidator = v.union(
  v.literal("equal"),
  v.literal("ratio"),
  v.literal("amount"),
  v.literal("full"),
);

/**
 * グループメンバーの役割
 * - owner: オーナー（招待・削除権限あり）
 * - member: 一般メンバー
 */
export const memberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("member"),
);

/**
 * 精算ステータス
 * - pending: 支払い待ち（精算確定後、支払い完了前）
 * - settled: 精算完了（全支払い完了）
 * - reopened: 再オープン（修正可能状態）
 */
export const settlementStatusValidator = v.union(
  v.literal("pending"),
  v.literal("settled"),
  v.literal("reopened"),
);

/**
 * サブスクリプションプラン
 * - free: 無料プラン
 * - premium: プレミアムプラン（広告なし）
 */
export const subscriptionPlanValidator = v.union(
  v.literal("free"),
  v.literal("premium"),
);

/**
 * サブスクリプションステータス
 * - active: 有効
 * - canceled: キャンセル済み（期間終了まで有効）
 * - past_due: 支払い遅延
 * - trialing: 試用期間中
 */
export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("canceled"),
  v.literal("past_due"),
  v.literal("trialing"),
);

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
 * - pending: 未精算
 * - settled: 精算完了
 */
export const settlementStatusValidator = v.union(
  v.literal("pending"),
  v.literal("settled"),
);

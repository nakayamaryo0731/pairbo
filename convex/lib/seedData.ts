/**
 * シードデータ定義
 * 開発・テスト用のサンプルデータ
 */

/** シードデータ識別用プレフィックス */
export const SEED_PREFIX = "seed_";

/** テストグループ名プレフィックス */
export const TEST_GROUP_PREFIX = "[TEST]";

/** シードユーザー定義 */
export const SEED_USERS = [
  {
    clerkId: "seed_partner_1",
    displayName: "パートナーA",
    avatarUrl: undefined,
  },
  {
    clerkId: "seed_partner_2",
    displayName: "パートナーB",
    avatarUrl: undefined,
  },
] as const;

/** テストグループ定義 */
export const TEST_GROUP = {
  name: "[TEST] テスト家計簿",
  description: "シードデータ用のテストグループ",
  closingDay: 25,
} as const;

/** ratio 分割の固定割合 */
export const RATIO_SPLIT = { partner1: 60, partner2: 40 } as const;

/** サンプル支出データ */
export const SAMPLE_EXPENSES = [
  {
    categoryName: "食費",
    amount: 3500,
    memo: "スーパーで買い物",
    splitMethod: "equal" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "食費",
    amount: 2800,
    memo: "外食（ランチ）",
    splitMethod: "equal" as const,
    paidByIndex: 1,
  },
  {
    categoryName: "光熱費",
    amount: 8500,
    memo: "電気代",
    splitMethod: "ratio" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "日用品",
    amount: 1200,
    memo: "洗剤・トイレットペーパー",
    splitMethod: "equal" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "交通費",
    amount: 500,
    memo: "バス代",
    splitMethod: "full" as const,
    paidByIndex: 1,
  },
  {
    categoryName: "娯楽",
    amount: 4200,
    memo: "映画",
    splitMethod: "equal" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "食費",
    amount: 1800,
    memo: "コンビニ",
    splitMethod: "equal" as const,
    paidByIndex: 1,
  },
  {
    categoryName: "光熱費",
    amount: 6200,
    memo: "ガス代",
    splitMethod: "ratio" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "医療費",
    amount: 2500,
    memo: "薬代",
    splitMethod: "full" as const,
    paidByIndex: 0,
  },
  {
    categoryName: "その他",
    amount: 3000,
    memo: "プレゼント",
    splitMethod: "equal" as const,
    paidByIndex: 1,
  },
] as const;

/** サンプル買い物リスト */
export const SAMPLE_SHOPPING_ITEMS = [
  { name: "牛乳" },
  { name: "卵" },
  { name: "食パン" },
  { name: "トイレットペーパー" },
  { name: "洗剤" },
] as const;

/**
 * サンプル精算データ
 * 先月分の精算済みデータを作成
 */
export const SAMPLE_SETTLEMENTS = [
  {
    // 先月分（精算完了）
    yearOffset: 0, // 今年
    monthOffset: -1, // 先月
    status: "settled" as const,
    payments: [
      {
        fromUserIndex: 1, // パートナーB
        toUserIndex: 0, // パートナーA
        amount: 3000,
        isPaid: true,
      },
    ],
  },
] as const;

/**
 * 精算期間を計算するヘルパー
 */
export function getSettlementPeriodForSeed(
  closingDay: number,
  yearOffset: number,
  monthOffset: number,
): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const targetYear = now.getFullYear() + yearOffset;
  const targetMonth = now.getMonth() + 1 + monthOffset;

  // 終了日 = 当月の締め日
  const endDate = new Date(targetYear, targetMonth - 1, closingDay);

  // 開始日 = 前月の締め日 + 1日
  const startDate = new Date(targetYear, targetMonth - 2, closingDay + 1);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    periodStart: formatDate(startDate),
    periodEnd: formatDate(endDate),
  };
}

/**
 * 過去30日以内のランダムな日付を生成
 */
export function generateRandomDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * シードユーザーかどうかを判定
 */
export function isSeedUser(clerkId: string): boolean {
  return clerkId.startsWith(SEED_PREFIX);
}

/**
 * テストグループかどうかを判定
 */
export function isTestGroup(name: string): boolean {
  return name.startsWith(TEST_GROUP_PREFIX);
}

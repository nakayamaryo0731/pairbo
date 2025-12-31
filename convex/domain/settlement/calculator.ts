import type { Id } from "../../_generated/dataModel";
import type { MemberBalance, Payment, SettlementPeriod } from "./types";

/**
 * 支出データ（計算に必要な最小限の情報）
 */
interface ExpenseData {
  _id: Id<"expenses">;
  paidBy: Id<"users">;
  amount: number;
}

/**
 * 支出分割データ
 */
interface SplitData {
  expenseId: Id<"expenses">;
  userId: Id<"users">;
  amount: number;
}

/**
 * 期間内の支出から各メンバーの収支を計算
 *
 * @param expenses 支出データ
 * @param splits 支出分割データ
 * @param memberIds グループメンバーのID一覧
 * @returns 各メンバーの収支
 */
export function calculateBalances(
  expenses: ExpenseData[],
  splits: SplitData[],
  memberIds: Id<"users">[],
): MemberBalance[] {
  const balances = new Map<Id<"users">, { paid: number; owed: number }>();

  // 初期化
  for (const memberId of memberIds) {
    balances.set(memberId, { paid: 0, owed: 0 });
  }

  // 支出ごとに集計
  for (const expense of expenses) {
    // 支払者のpaidを加算
    const payer = balances.get(expense.paidBy);
    if (payer) {
      payer.paid += expense.amount;
    }

    // 各負担者のowedを加算
    const expenseSplits = splits.filter((s) => s.expenseId === expense._id);
    for (const split of expenseSplits) {
      const member = balances.get(split.userId);
      if (member) {
        member.owed += split.amount;
      }
    }
  }

  // net計算して返す
  return Array.from(balances.entries()).map(([userId, { paid, owed }]) => ({
    userId,
    paid,
    owed,
    net: paid - owed,
  }));
}

/**
 * 最小送金回数で精算を計算（貪欲法）
 *
 * アルゴリズム:
 * 1. 債務者（net < 0）と債権者（net > 0）に分ける
 * 2. 最大の債務者と最大の債権者をマッチング
 * 3. 小さい方の金額で送金、残りを繰り越し
 * 4. どちらかがゼロになるまで繰り返し
 *
 * @param balances 各メンバーの収支
 * @returns 精算に必要な送金リスト
 */
export function minimizeTransfers(balances: MemberBalance[]): Payment[] {
  const payments: Payment[] = [];

  // 債務者と債権者に分ける
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ userId: b.userId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount); // 大きい順

  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ userId: b.userId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount); // 大きい順

  let i = 0; // 債務者インデックス
  let j = 0; // 債権者インデックス

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // 送金額は小さい方
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      payments.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount,
      });
    }

    // 残額を更新
    debtor.amount -= amount;
    creditor.amount -= amount;

    // ゼロになったら次へ
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  return payments;
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 締め日と年月から精算期間を計算
 *
 * @param closingDay 締め日（1-28）
 * @param year 対象年
 * @param month 対象月（1-12）
 * @returns 精算期間（開始日、終了日）
 *
 * @example
 * // 締め日25日、2024年12月分
 * getSettlementPeriod(25, 2024, 12)
 * // → { startDate: "2024-11-26", endDate: "2024-12-25" }
 */
export function getSettlementPeriod(
  closingDay: number,
  year: number,
  month: number,
): SettlementPeriod {
  // 終了日 = 当月の締め日
  const endDate = new Date(year, month - 1, closingDay);

  // 開始日 = 前月の締め日 + 1日
  const startDate = new Date(year, month - 2, closingDay + 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

/**
 * 日付文字列が精算期間内かどうかを判定
 *
 * @param date 判定する日付（YYYY-MM-DD）
 * @param period 精算期間
 * @returns 期間内ならtrue
 */
export function isDateInPeriod(
  date: string,
  period: SettlementPeriod,
): boolean {
  return date >= period.startDate && date <= period.endDate;
}

/**
 * 精算期間の表示用ラベルを生成
 *
 * @param year 年
 * @param month 月
 * @returns 表示用ラベル（例: "2024年12月分"）
 */
export function getSettlementLabel(year: number, month: number): string {
  return `${year}年${month}月分`;
}

/**
 * 今日が含まれる精算期間の年月を取得
 *
 * @param closingDay 締め日（1-28）
 * @returns 精算期間の年月
 *
 * @example
 * // 締め日25日、今日が12/31の場合
 * getCurrentSettlementYearMonth(25)
 * // → { year: 2025, month: 1 }（12/26〜1/25の期間 = 1月分）
 *
 * // 締め日25日、今日が12/20の場合
 * getCurrentSettlementYearMonth(25)
 * // → { year: 2024, month: 12 }（11/26〜12/25の期間 = 12月分）
 */
export function getCurrentSettlementYearMonth(closingDay: number): {
  year: number;
  month: number;
} {
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // 締め日を過ぎている場合は翌月分
  if (today > closingDay) {
    if (currentMonth === 12) {
      return { year: currentYear + 1, month: 1 };
    }
    return { year: currentYear, month: currentMonth + 1 };
  }

  // 締め日以前の場合は今月分
  return { year: currentYear, month: currentMonth };
}

/**
 * 指定した日付が属する精算期間の年月を取得
 *
 * @param date 日付（YYYY-MM-DD）
 * @param closingDay 締め日（1-28）
 * @returns 精算期間の年月
 *
 * @example
 * // 締め日25日、日付が12/31の場合
 * getSettlementYearMonthForDate("2024-12-31", 25)
 * // → { year: 2025, month: 1 }（12/26〜1/25の期間 = 1月分）
 *
 * // 締め日25日、日付が12/20の場合
 * getSettlementYearMonthForDate("2024-12-20", 25)
 * // → { year: 2024, month: 12 }（11/26〜12/25の期間 = 12月分）
 */
export function getSettlementYearMonthForDate(
  date: string,
  closingDay: number,
): { year: number; month: number } {
  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 締め日を過ぎている場合は翌月分
  if (day > closingDay) {
    if (month === 12) {
      return { year: year + 1, month: 1 };
    }
    return { year, month: month + 1 };
  }

  // 締め日以前の場合は当月分
  return { year, month };
}

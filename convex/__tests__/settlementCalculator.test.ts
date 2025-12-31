import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  calculateBalances,
  minimizeTransfers,
  getSettlementPeriod,
  isDateInPeriod,
  getSettlementLabel,
  getCurrentSettlementYearMonth,
  getSettlementYearMonthForDate,
} from "../domain/settlement";

// テスト用のモックID生成
function mockUserId(n: number): Id<"users"> {
  return `user_${n}` as Id<"users">;
}

function mockExpenseId(n: number): Id<"expenses"> {
  return `expense_${n}` as Id<"expenses">;
}

describe("settlement/calculator", () => {
  describe("calculateBalances", () => {
    test("支出がない場合、全員ゼロ", () => {
      const memberIds = [mockUserId(1), mockUserId(2)];
      const balances = calculateBalances([], [], memberIds);

      expect(balances).toHaveLength(2);
      expect(balances[0]).toEqual({
        userId: mockUserId(1),
        paid: 0,
        owed: 0,
        net: 0,
      });
      expect(balances[1]).toEqual({
        userId: mockUserId(2),
        paid: 0,
        owed: 0,
        net: 0,
      });
    });

    test("2人で均等分割の場合", () => {
      const memberIds = [mockUserId(1), mockUserId(2)];
      const expenses = [
        { _id: mockExpenseId(1), paidBy: mockUserId(1), amount: 1000 },
      ];
      const splits = [
        { expenseId: mockExpenseId(1), userId: mockUserId(1), amount: 500 },
        { expenseId: mockExpenseId(1), userId: mockUserId(2), amount: 500 },
      ];

      const balances = calculateBalances(expenses, splits, memberIds);

      // user1: paid=1000, owed=500, net=+500（受け取る）
      expect(balances.find((b) => b.userId === mockUserId(1))).toEqual({
        userId: mockUserId(1),
        paid: 1000,
        owed: 500,
        net: 500,
      });
      // user2: paid=0, owed=500, net=-500（支払う）
      expect(balances.find((b) => b.userId === mockUserId(2))).toEqual({
        userId: mockUserId(2),
        paid: 0,
        owed: 500,
        net: -500,
      });
    });

    test("3人で複数の支出がある場合", () => {
      const memberIds = [mockUserId(1), mockUserId(2), mockUserId(3)];
      const expenses = [
        { _id: mockExpenseId(1), paidBy: mockUserId(1), amount: 900 },
        { _id: mockExpenseId(2), paidBy: mockUserId(2), amount: 600 },
      ];
      const splits = [
        // expense1: 各300円
        { expenseId: mockExpenseId(1), userId: mockUserId(1), amount: 300 },
        { expenseId: mockExpenseId(1), userId: mockUserId(2), amount: 300 },
        { expenseId: mockExpenseId(1), userId: mockUserId(3), amount: 300 },
        // expense2: 各200円
        { expenseId: mockExpenseId(2), userId: mockUserId(1), amount: 200 },
        { expenseId: mockExpenseId(2), userId: mockUserId(2), amount: 200 },
        { expenseId: mockExpenseId(2), userId: mockUserId(3), amount: 200 },
      ];

      const balances = calculateBalances(expenses, splits, memberIds);

      // user1: paid=900, owed=500, net=+400
      expect(balances.find((b) => b.userId === mockUserId(1))).toEqual({
        userId: mockUserId(1),
        paid: 900,
        owed: 500,
        net: 400,
      });
      // user2: paid=600, owed=500, net=+100
      expect(balances.find((b) => b.userId === mockUserId(2))).toEqual({
        userId: mockUserId(2),
        paid: 600,
        owed: 500,
        net: 100,
      });
      // user3: paid=0, owed=500, net=-500
      expect(balances.find((b) => b.userId === mockUserId(3))).toEqual({
        userId: mockUserId(3),
        paid: 0,
        owed: 500,
        net: -500,
      });
    });

    test("メンバー以外が支払った支出は無視される", () => {
      const memberIds = [mockUserId(1), mockUserId(2)];
      const expenses = [
        { _id: mockExpenseId(1), paidBy: mockUserId(99), amount: 1000 },
      ];
      const splits = [
        { expenseId: mockExpenseId(1), userId: mockUserId(1), amount: 500 },
        { expenseId: mockExpenseId(1), userId: mockUserId(2), amount: 500 },
      ];

      const balances = calculateBalances(expenses, splits, memberIds);

      // 支払者がメンバー外なので、paidは加算されない
      expect(balances.find((b) => b.userId === mockUserId(1))).toEqual({
        userId: mockUserId(1),
        paid: 0,
        owed: 500,
        net: -500,
      });
    });
  });

  describe("minimizeTransfers", () => {
    test("収支がゼロの場合、送金なし", () => {
      const balances = [
        { userId: mockUserId(1), paid: 0, owed: 0, net: 0 },
        { userId: mockUserId(2), paid: 0, owed: 0, net: 0 },
      ];

      const payments = minimizeTransfers(balances);
      expect(payments).toEqual([]);
    });

    test("2人の場合", () => {
      const balances = [
        { userId: mockUserId(1), paid: 1000, owed: 500, net: 500 },
        { userId: mockUserId(2), paid: 0, owed: 500, net: -500 },
      ];

      const payments = minimizeTransfers(balances);

      expect(payments).toHaveLength(1);
      expect(payments[0]).toEqual({
        fromUserId: mockUserId(2),
        toUserId: mockUserId(1),
        amount: 500,
      });
    });

    test("3人の場合（1人が複数人に払う）", () => {
      const balances = [
        { userId: mockUserId(1), paid: 600, owed: 300, net: 300 },
        { userId: mockUserId(2), paid: 300, owed: 300, net: 0 },
        { userId: mockUserId(3), paid: 0, owed: 300, net: -300 },
      ];

      const payments = minimizeTransfers(balances);

      expect(payments).toHaveLength(1);
      expect(payments[0]).toEqual({
        fromUserId: mockUserId(3),
        toUserId: mockUserId(1),
        amount: 300,
      });
    });

    test("3人の場合（1人が2人に支払う）", () => {
      const balances = [
        { userId: mockUserId(1), paid: 900, owed: 500, net: 400 },
        { userId: mockUserId(2), paid: 600, owed: 500, net: 100 },
        { userId: mockUserId(3), paid: 0, owed: 500, net: -500 },
      ];

      const payments = minimizeTransfers(balances);

      // user3 → user1: 400円
      // user3 → user2: 100円
      expect(payments).toHaveLength(2);
      expect(payments).toContainEqual({
        fromUserId: mockUserId(3),
        toUserId: mockUserId(1),
        amount: 400,
      });
      expect(payments).toContainEqual({
        fromUserId: mockUserId(3),
        toUserId: mockUserId(2),
        amount: 100,
      });
    });

    test("全員の収支がプラスマイナスゼロになる", () => {
      const balances = [
        { userId: mockUserId(1), paid: 1500, owed: 1000, net: 500 },
        { userId: mockUserId(2), paid: 500, owed: 1000, net: -500 },
        { userId: mockUserId(3), paid: 1000, owed: 1000, net: 0 },
      ];

      const payments = minimizeTransfers(balances);

      // 送金の合計が一致することを確認
      const totalFromDebtors = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalFromDebtors).toBe(500); // 債務者の合計債務
    });
  });

  describe("getSettlementPeriod", () => {
    test("締め日25日、12月分", () => {
      const period = getSettlementPeriod(25, 2024, 12);
      expect(period).toEqual({
        startDate: "2024-11-26",
        endDate: "2024-12-25",
      });
    });

    test("締め日1日、1月分", () => {
      const period = getSettlementPeriod(1, 2024, 1);
      expect(period).toEqual({
        startDate: "2023-12-02",
        endDate: "2024-01-01",
      });
    });

    test("締め日末日（28日）、3月分", () => {
      const period = getSettlementPeriod(28, 2024, 3);
      expect(period).toEqual({
        startDate: "2024-02-29", // うるう年
        endDate: "2024-03-28",
      });
    });

    test("年をまたぐ場合（1月分）", () => {
      const period = getSettlementPeriod(25, 2024, 1);
      expect(period).toEqual({
        startDate: "2023-12-26",
        endDate: "2024-01-25",
      });
    });

    test("締め日15日、6月分", () => {
      const period = getSettlementPeriod(15, 2024, 6);
      expect(period).toEqual({
        startDate: "2024-05-16",
        endDate: "2024-06-15",
      });
    });
  });

  describe("isDateInPeriod", () => {
    const period = { startDate: "2024-11-26", endDate: "2024-12-25" };

    test("期間内の日付はtrue", () => {
      expect(isDateInPeriod("2024-11-26", period)).toBe(true);
      expect(isDateInPeriod("2024-12-01", period)).toBe(true);
      expect(isDateInPeriod("2024-12-25", period)).toBe(true);
    });

    test("期間外の日付はfalse", () => {
      expect(isDateInPeriod("2024-11-25", period)).toBe(false);
      expect(isDateInPeriod("2024-12-26", period)).toBe(false);
      expect(isDateInPeriod("2025-01-01", period)).toBe(false);
    });
  });

  describe("getSettlementLabel", () => {
    test("表示ラベルを生成", () => {
      expect(getSettlementLabel(2024, 12)).toBe("2024年12月分");
      expect(getSettlementLabel(2025, 1)).toBe("2025年1月分");
    });
  });

  describe("getCurrentSettlementYearMonth", () => {
    test("締め日より前の日付は今月分", () => {
      // 例: 締め日25日、今日が12月10日 → 12月分
      const mockDate = new Date(2024, 11, 10); // 2024-12-10
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - constructor signature
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = getCurrentSettlementYearMonth(25);
      expect(result).toEqual({ year: 2024, month: 12 });

      global.Date = originalDate;
    });

    test("締め日と同日は今月分", () => {
      // 例: 締め日25日、今日が12月25日 → 12月分
      const mockDate = new Date(2024, 11, 25); // 2024-12-25
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - constructor signature
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = getCurrentSettlementYearMonth(25);
      expect(result).toEqual({ year: 2024, month: 12 });

      global.Date = originalDate;
    });

    test("締め日より後の日付は翌月分", () => {
      // 例: 締め日25日、今日が12月26日 → 1月分（翌年）
      const mockDate = new Date(2024, 11, 26); // 2024-12-26
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - constructor signature
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = getCurrentSettlementYearMonth(25);
      expect(result).toEqual({ year: 2025, month: 1 });

      global.Date = originalDate;
    });

    test("年末に翌月分になる場合は年が繰り上がる", () => {
      // 例: 締め日15日、今日が12月20日 → 2025年1月分
      const mockDate = new Date(2024, 11, 20); // 2024-12-20
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - constructor signature
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = getCurrentSettlementYearMonth(15);
      expect(result).toEqual({ year: 2025, month: 1 });

      global.Date = originalDate;
    });

    test("締め日より後でも12月でなければ同年の翌月", () => {
      // 例: 締め日10日、今日が6月15日 → 7月分
      const mockDate = new Date(2024, 5, 15); // 2024-06-15
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - constructor signature
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = getCurrentSettlementYearMonth(10);
      expect(result).toEqual({ year: 2024, month: 7 });

      global.Date = originalDate;
    });
  });

  describe("getSettlementYearMonthForDate", () => {
    test("締め日以内の日付はその月の精算期間", () => {
      // 締め日25日、12月10日 → 12月分
      expect(getSettlementYearMonthForDate("2024-12-10", 25)).toEqual({
        year: 2024,
        month: 12,
      });
    });

    test("締め日当日はその月の精算期間", () => {
      // 締め日25日、12月25日 → 12月分
      expect(getSettlementYearMonthForDate("2024-12-25", 25)).toEqual({
        year: 2024,
        month: 12,
      });
    });

    test("締め日を過ぎた日付は翌月の精算期間", () => {
      // 締め日25日、12月26日 → 1月分
      expect(getSettlementYearMonthForDate("2024-12-26", 25)).toEqual({
        year: 2025,
        month: 1,
      });
    });

    test("月初の日付でも正しく計算される", () => {
      // 締め日25日、12月1日 → 12月分（前月26日〜当月25日）
      expect(getSettlementYearMonthForDate("2024-12-01", 25)).toEqual({
        year: 2024,
        month: 12,
      });
    });

    test("年をまたぐ場合（1月の日付）", () => {
      // 締め日25日、1月10日 → 1月分
      expect(getSettlementYearMonthForDate("2024-01-10", 25)).toEqual({
        year: 2024,
        month: 1,
      });
    });

    test("締め日1日の場合", () => {
      // 締め日1日、1月1日 → 1月分
      expect(getSettlementYearMonthForDate("2024-01-01", 1)).toEqual({
        year: 2024,
        month: 1,
      });
      // 締め日1日、1月2日 → 2月分
      expect(getSettlementYearMonthForDate("2024-01-02", 1)).toEqual({
        year: 2024,
        month: 2,
      });
    });

    test("締め日末日（28日）の場合", () => {
      // 締め日28日、3月28日 → 3月分
      expect(getSettlementYearMonthForDate("2024-03-28", 28)).toEqual({
        year: 2024,
        month: 3,
      });
      // 締め日28日、3月29日 → 4月分
      expect(getSettlementYearMonthForDate("2024-03-29", 28)).toEqual({
        year: 2024,
        month: 4,
      });
    });
  });
});

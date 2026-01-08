import { useState, useMemo, useCallback } from "react";
import { formatDateISO } from "@/lib/formatters";

type YearMonth = { year: number; month: number };

/**
 * 今日が含まれる精算期間の年月を計算
 */
function getCurrentSettlementYearMonth(closingDay: number): YearMonth {
  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (today > closingDay) {
    if (currentMonth === 12) {
      return { year: currentYear + 1, month: 1 };
    }
    return { year: currentYear, month: currentMonth + 1 };
  }

  return { year: currentYear, month: currentMonth };
}

/**
 * 現在の年月を取得（シンプルなカレンダー月）
 */
function getCurrentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * 精算期間を計算（開始日〜終了日）
 */
function getSettlementPeriod(
  closingDay: number,
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const endDate = new Date(year, month - 1, closingDay);
  const startDate = new Date(year, month - 2, closingDay + 1);

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
  };
}

type UsePeriodNavigationOptions = {
  /**
   * 締め日（指定すると精算期間ベースのナビゲーションになる）
   */
  closingDay?: number;
  /**
   * 初期の年
   */
  initialYear?: number;
  /**
   * 初期の月
   */
  initialMonth?: number;
};

type UsePeriodNavigationReturn = {
  /** 現在表示中の年 */
  year: number;
  /** 現在表示中の月 */
  month: number;
  /** 前月へ移動 */
  goToPreviousMonth: () => void;
  /** 次月へ移動 */
  goToNextMonth: () => void;
  /** 次月へ移動可能か */
  canGoNextMonth: boolean;
  /** 前年へ移動 */
  goToPreviousYear: () => void;
  /** 次年へ移動 */
  goToNextYear: () => void;
  /** 次年へ移動可能か */
  canGoNextYear: boolean;
  /** 期間情報（closingDayが指定されている場合のみ） */
  period: { startDate: string; endDate: string } | null;
  /** 今期の年月（closingDayが指定されている場合は精算期間ベース） */
  currentPeriod: YearMonth;
  /** 年月をリセット（今期に戻る） */
  resetToCurrentPeriod: () => void;
};

/**
 * 期間ナビゲーション用のカスタムフック
 *
 * @example
 * // シンプルな月ナビゲーション（買い物リスト履歴など）
 * const { year, month, goToPreviousMonth, goToNextMonth, canGoNextMonth } =
 *   usePeriodNavigation();
 *
 * @example
 * // 精算期間ベースのナビゲーション
 * const { year, month, period, goToPreviousMonth, goToNextMonth, canGoNextMonth } =
 *   usePeriodNavigation({ closingDay: 25 });
 *
 * @example
 * // 年次ナビゲーション
 * const { year, goToPreviousYear, goToNextYear, canGoNextYear } =
 *   usePeriodNavigation({ closingDay: 25 });
 */
export function usePeriodNavigation(
  options: UsePeriodNavigationOptions = {},
): UsePeriodNavigationReturn {
  const { closingDay, initialYear, initialMonth } = options;

  // 今期を計算
  const currentPeriod = useMemo(() => {
    if (closingDay !== undefined) {
      return getCurrentSettlementYearMonth(closingDay);
    }
    return getCurrentYearMonth();
  }, [closingDay]);

  // 初期値を決定
  const [year, setYear] = useState<number>(
    () => initialYear ?? currentPeriod.year,
  );
  const [month, setMonth] = useState<number>(
    () => initialMonth ?? currentPeriod.month,
  );

  // 月次ナビゲーション
  const canGoNextMonth =
    year < currentPeriod.year ||
    (year === currentPeriod.year && month < currentPeriod.month);

  const goToPreviousMonth = useCallback(() => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (!canGoNextMonth) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month, canGoNextMonth]);

  // 年次ナビゲーション
  const canGoNextYear = year < currentPeriod.year;

  const goToPreviousYear = useCallback(() => {
    setYear((y) => y - 1);
  }, []);

  const goToNextYear = useCallback(() => {
    if (!canGoNextYear) return;
    setYear((y) => y + 1);
  }, [canGoNextYear]);

  // 期間情報（締め日がある場合のみ計算）
  const period = useMemo(() => {
    if (closingDay === undefined) return null;
    return getSettlementPeriod(closingDay, year, month);
  }, [closingDay, year, month]);

  // 今期にリセット
  const resetToCurrentPeriod = useCallback(() => {
    setYear(currentPeriod.year);
    setMonth(currentPeriod.month);
  }, [currentPeriod]);

  return {
    year,
    month,
    goToPreviousMonth,
    goToNextMonth,
    canGoNextMonth,
    goToPreviousYear,
    goToNextYear,
    canGoNextYear,
    period,
    currentPeriod,
    resetToCurrentPeriod,
  };
}

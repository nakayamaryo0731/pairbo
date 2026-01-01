"use client";

import { formatPeriod } from "@/lib/formatters";

type PeriodNavigatorProps = {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
};

export function PeriodNavigator({
  year,
  month,
  startDate,
  endDate,
  onPrevious,
  onNext,
  canGoNext,
}: PeriodNavigatorProps) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
      <button
        onClick={onPrevious}
        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        aria-label="前の月へ"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="text-center">
        <div className="font-medium text-slate-800">
          {year}年{month}月分
        </div>
        <div className="text-sm text-slate-500">
          {formatPeriod(startDate, endDate)}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="次の月へ"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

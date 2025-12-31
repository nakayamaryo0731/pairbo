"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberList } from "./MemberList";
import { InviteDialog } from "./InviteDialog";
import { PeriodExpenseList } from "@/components/expenses/PeriodExpenseList";
import {
  SettlementPreview,
  SettlementHistory,
  PeriodNavigator,
} from "@/components/settlements";

type GroupDetailProps = {
  group: {
    _id: Id<"groups">;
    name: string;
    description?: string;
    closingDay: number;
  };
  members: {
    _id: Id<"groupMembers">;
    userId: Id<"users">;
    displayName: string;
    avatarUrl?: string;
    role: "owner" | "member";
    joinedAt: number;
    isMe: boolean;
  }[];
  myRole: "owner" | "member";
};

/**
 * 今日が含まれる精算期間の年月を計算
 */
function getCurrentSettlementYearMonth(closingDay: number): {
  year: number;
  month: number;
} {
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
 * 精算期間を計算
 */
function getSettlementPeriod(
  closingDay: number,
  year: number,
  month: number,
): { startDate: string; endDate: string } {
  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const endDate = new Date(year, month - 1, closingDay);
  const startDate = new Date(year, month - 2, closingDay + 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export function GroupDetail({ group, members, myRole }: GroupDetailProps) {
  // 今期の年月を初期値として設定
  const initialPeriod = useMemo(
    () => getCurrentSettlementYearMonth(group.closingDay),
    [group.closingDay],
  );

  const [displayYear, setDisplayYear] = useState(initialPeriod.year);
  const [displayMonth, setDisplayMonth] = useState(initialPeriod.month);

  // 現在の精算期間
  const currentPeriod = useMemo(
    () => getCurrentSettlementYearMonth(group.closingDay),
    [group.closingDay],
  );

  // 表示中の期間
  const period = useMemo(
    () => getSettlementPeriod(group.closingDay, displayYear, displayMonth),
    [group.closingDay, displayYear, displayMonth],
  );

  // 翌月へ移動可能かどうか（今期より先には進めない）
  const canGoNext =
    displayYear < currentPeriod.year ||
    (displayYear === currentPeriod.year &&
      displayMonth < currentPeriod.month);

  const goToPreviousMonth = () => {
    if (displayMonth === 1) {
      setDisplayYear(displayYear - 1);
      setDisplayMonth(12);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;

    if (displayMonth === 12) {
      setDisplayYear(displayYear + 1);
      setDisplayMonth(1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* グループ情報 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-slate-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
          <span>締め日: 毎月{group.closingDay}日</span>
        </div>
        {group.description && (
          <p className="mt-2 text-sm text-slate-500">{group.description}</p>
        )}
      </div>

      {/* メンバー一覧 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-slate-800">
            メンバー ({members.length}人)
          </h2>
          {myRole === "owner" && (
            <InviteDialog groupId={group._id} groupName={group.name} />
          )}
        </div>
        <MemberList members={members} />
      </div>

      {/* 今期の精算（主役） */}
      <div>
        <h2 className="font-medium text-slate-800 mb-3">今期の精算</h2>
        <div className="space-y-3">
          <PeriodNavigator
            year={displayYear}
            month={displayMonth}
            startDate={period.startDate}
            endDate={period.endDate}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            canGoNext={canGoNext}
          />
          <SettlementPreview
            groupId={group._id}
            year={displayYear}
            month={displayMonth}
            isOwner={myRole === "owner"}
          />
        </div>
      </div>

      {/* この期間の支出 */}
      <div>
        <h2 className="font-medium text-slate-800 mb-3">この期間の支出</h2>
        <PeriodExpenseList
          groupId={group._id}
          year={displayYear}
          month={displayMonth}
        />
      </div>

      {/* 過去の精算 */}
      <div>
        <h2 className="font-medium text-slate-800 mb-3">過去の精算</h2>
        <SettlementHistory groupId={group._id} />
      </div>

      {/* 支出記録ボタン */}
      <div className="fixed bottom-6 right-6">
        <Link
          href={`/groups/${group._id}/expenses/new`}
          className="w-14 h-14 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

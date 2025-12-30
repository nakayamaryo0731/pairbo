"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MemberList } from "./MemberList";
import { InviteDialog } from "./InviteDialog";
import { ExpenseList } from "@/components/expenses/ExpenseList";

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

export function GroupDetail({ group, members, myRole }: GroupDetailProps) {
  const expenses = useQuery(api.expenses.listByGroup, { groupId: group._id });

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

      {/* 支出一覧 */}
      <div>
        <h2 className="font-medium text-slate-800 mb-3">支出履歴</h2>
        {expenses === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <ExpenseList expenses={expenses} />
        )}
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

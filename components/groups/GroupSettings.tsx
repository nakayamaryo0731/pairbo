"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { InviteDialog } from "./InviteDialog";
import { CategoryManager } from "@/components/categories";
import { ChevronLeft, Calendar, Users, Tag, ShoppingCart } from "lucide-react";

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
  isPreset: boolean;
};

type Member = {
  _id: Id<"groupMembers">;
  userId: Id<"users">;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "member";
  joinedAt: number;
  isMe: boolean;
};

type GroupSettingsProps = {
  group: {
    _id: Id<"groups">;
    name: string;
    description?: string;
    closingDay: number;
  };
  members: Member[];
  categories: Category[];
  myRole: "owner" | "member";
};

export function GroupSettings({
  group,
  members,
  categories,
  myRole,
}: GroupSettingsProps) {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link
          href={`/groups/${group._id}`}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">グループ設定</h1>
      </div>

      {/* 締め日 */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">締め日</p>
            <p className="font-medium text-slate-800">
              毎月 {group.closingDay} 日
            </p>
          </div>
        </div>
      </section>

      {/* メンバー */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">メンバー</p>
                <p className="font-medium text-slate-800">{members.length}人</p>
              </div>
            </div>
            {myRole === "owner" && (
              <InviteDialog groupId={group._id} groupName={group.name} />
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {members.map((member) => (
            <div key={member._id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                {member.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">
                  {member.displayName}
                  {member.isMe && (
                    <span className="ml-1 text-xs text-slate-500">(自分)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {member.role === "owner" ? "オーナー" : "メンバー"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* カテゴリ */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <Tag className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">カテゴリ</p>
              <p className="font-medium text-slate-800">
                {categories.length}個
              </p>
            </div>
          </div>
          <CategoryManager groupId={group._id} categories={categories} />
        </div>
      </section>

      {/* 買い物リスト */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <Link
          href={`/groups/${group._id}/shopping`}
          className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">買い物リスト</p>
            <p className="text-sm text-slate-500">
              グループで共有する買い物リスト
            </p>
          </div>
          <ChevronLeft className="h-5 w-5 text-slate-400 rotate-180" />
        </Link>
      </section>
    </div>
  );
}

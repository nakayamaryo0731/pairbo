"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InviteDialog } from "./InviteDialog";
import { CategoryManager } from "@/components/categories";
import {
  Calendar,
  Users,
  Tag,
  ShoppingCart,
  Home,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import {
  InlineEditText,
  InlineEditDisplay,
  InlineEditControls,
  InlineEditButton,
} from "@/components/ui/InlineEdit";

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
  const updateGroupName = useMutation(api.groups.updateName);
  const updateClosingDay = useMutation(api.groups.updateClosingDay);
  const updateDisplayName = useMutation(api.users.updateDisplayName);

  const myMember = members.find((m) => m.isMe);

  // グループ名の編集
  const groupNameEdit = useInlineEdit({
    initialValue: group.name,
    onSave: async (name) => {
      await updateGroupName({ groupId: group._id, name: name.trim() });
    },
    validate: (name) => name.trim() !== "",
  });

  // 締め日の編集
  const closingDayEdit = useInlineEdit({
    initialValue: group.closingDay,
    onSave: async (closingDay) => {
      await updateClosingDay({ groupId: group._id, closingDay });
    },
    validate: (day) => day >= 1 && day <= 28,
  });

  // 表示名の編集
  const displayNameEdit = useInlineEdit({
    initialValue: myMember?.displayName ?? "",
    onSave: async (displayName) => {
      await updateDisplayName({ displayName: displayName.trim() });
    },
    validate: (name) => name.trim() !== "",
  });

  return (
    <div className="space-y-6">
      {/* グループ名 */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Home className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">グループ名</p>
            {groupNameEdit.isEditing ? (
              <div className="mt-1">
                <InlineEditText
                  value={groupNameEdit.value}
                  onChange={groupNameEdit.setValue}
                  maxLength={50}
                  onSave={groupNameEdit.save}
                  onCancel={groupNameEdit.cancelEditing}
                  isSaving={groupNameEdit.isSaving}
                />
              </div>
            ) : (
              <InlineEditDisplay
                showEditButton={myRole === "owner"}
                onEdit={groupNameEdit.startEditing}
              >
                <p className="font-medium text-slate-800">{group.name}</p>
              </InlineEditDisplay>
            )}
          </div>
        </div>
      </section>

      {/* 締め日 */}
      <section className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-500">締め日</p>
            {closingDayEdit.isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-600">毎月</span>
                <select
                  value={closingDayEdit.value}
                  onChange={(e) =>
                    closingDayEdit.setValue(Number(e.target.value))
                  }
                  className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={closingDayEdit.isSaving}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-slate-600">日</span>
                <InlineEditControls
                  onSave={closingDayEdit.save}
                  onCancel={closingDayEdit.cancelEditing}
                  isSaving={closingDayEdit.isSaving}
                />
              </div>
            ) : (
              <InlineEditDisplay
                showEditButton={myRole === "owner"}
                onEdit={closingDayEdit.startEditing}
              >
                <p className="font-medium text-slate-800">
                  毎月 {group.closingDay} 日
                </p>
              </InlineEditDisplay>
            )}
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
                {member.isMe && displayNameEdit.isEditing ? (
                  <InlineEditText
                    value={displayNameEdit.value}
                    onChange={displayNameEdit.setValue}
                    maxLength={20}
                    onSave={displayNameEdit.save}
                    onCancel={displayNameEdit.cancelEditing}
                    isSaving={displayNameEdit.isSaving}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {member.displayName}
                      {member.isMe && (
                        <span className="ml-1 text-xs text-slate-500">
                          (自分)
                        </span>
                      )}
                    </p>
                    {member.isMe && (
                      <InlineEditButton
                        onClick={displayNameEdit.startEditing}
                      />
                    )}
                  </div>
                )}
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
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      </section>

      {/* プラン管理 */}
      <section className="bg-white border border-slate-200 rounded-lg">
        <Link
          href="/pricing"
          className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-slate-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">プラン・お支払い</p>
            <p className="text-sm text-slate-500">Premiumプランの確認・変更</p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
      </section>

      {/* 法的情報 */}
      <section className="pt-4">
        <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500">
          <Link href="/privacy" className="hover:text-slate-700">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-slate-700">
            利用規約
          </Link>
          <Link href="/legal/tokushoho" className="hover:text-slate-700">
            特定商取引法に基づく表記
          </Link>
        </div>
      </section>
    </div>
  );
}

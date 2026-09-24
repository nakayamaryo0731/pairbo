"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { InviteDialog } from "./InviteDialog";
import { CategoryManager } from "@/components/categories";
import { TagManager } from "@/components/tags";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { MEMBER_COLORS } from "@/lib/userColors";
import {
  Calendar,
  Users,
  Tag,
  Tags,
  Home,
  ChevronRight,
  ChevronDown,
  CreditCard,
  MessageCircle,
  RefreshCw,
  Star,
  Shield,
  Check,
  HelpCircle,
} from "lucide-react";
import { RecurringExpenseManager } from "@/components/settings/RecurringExpenseManager";
import { InquiryDialog } from "@/components/inquiries/InquiryDialog";
import { UsageGuideDialog } from "@/components/pwa/UsageGuideDialog";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useGroupPremium } from "@/hooks/useGroupPremium";
import { InlineEditText, InlineEditDisplay } from "@/components/ui/InlineEdit";
import { APP_VERSION } from "@/lib/version";
import { setLastGroupId } from "@/lib/lastGroup";
import { readTrialState } from "@/lib/trial";
import type { ClosingDay } from "@/convex/domain/group/types";

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
  color?: string;
  joinedAt: number;
  isMe: boolean;
};

type GroupSettingsProps = {
  group: {
    _id: Id<"groups">;
    name: string;
    description?: string;
    closingDay: ClosingDay;
  };
  members: Member[];
  categories: Category[];
  myRole: "owner" | "member";
  memberColors?: Record<string, string>;
};

function SettingRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        {children}
      </div>
    </div>
  );
}

export function GroupSettings({
  group,
  members,
  categories,
  myRole,
  memberColors,
}: GroupSettingsProps) {
  const me = useQuery(api.users.getMe);
  const subscription = useQuery(api.subscriptions.getMySubscription);
  const { isPremium: isGroupPremiumActive } = useGroupPremium(group._id);
  const updateGroupName = useMutation(api.groups.updateName);
  const updateClosingDay = useMutation(api.groups.updateClosingDay);
  const updateDisplayName = useMutation(api.users.updateDisplayName);
  const setDefaultGroup = useMutation(api.users.setDefaultGroup);
  const updateMemberColor = useMutation(api.groups.updateMemberColor);
  const setAdminPlanOverride = useMutation(
    api.subscriptions.setAdminPlanOverride,
  );

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const isDefaultGroup = me?.defaultGroupId === group._id;

  const handleSetDefault = async (checked: boolean) => {
    await setDefaultGroup({ groupId: checked ? group._id : null });
    // 次回起動の即時遷移先をデフォルト設定と揃える
    if (checked) {
      setLastGroupId(group._id);
    }
  };

  const myMember = members.find((m) => m.isMe);

  const groupNameEdit = useInlineEdit({
    initialValue: group.name,
    onSave: async (name) => {
      await updateGroupName({ groupId: group._id, name: name.trim() });
    },
    validate: (name) => name.trim() !== "",
  });

  const closingDayEdit = useInlineEdit({
    initialValue: group.closingDay,
    onSave: async (closingDay) => {
      await updateClosingDay({ groupId: group._id, closingDay });
    },
    validate: (day) => day === "end_of_month" || (day >= 1 && day <= 28),
  });

  const displayNameEdit = useInlineEdit({
    initialValue: myMember?.displayName ?? "",
    onSave: async (displayName) => {
      await updateDisplayName({ displayName: displayName.trim() });
    },
    validate: (name) => name.trim() !== "",
  });

  return (
    <div className="p-4 space-y-3">
      {/* グループ設定: 名前 + 締め日 + デフォルト */}
      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        <SettingRow
          icon={<Home className="h-4 w-4 text-slate-600" />}
          label="グループ名"
        >
          {groupNameEdit.isEditing ? (
            <div className="mt-0.5">
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
              editable={myRole === "owner"}
              onEdit={groupNameEdit.startEditing}
            >
              <p className="font-medium text-slate-800 truncate">
                {group.name}
              </p>
            </InlineEditDisplay>
          )}
        </SettingRow>

        <SettingRow
          icon={<Calendar className="h-4 w-4 text-slate-600" />}
          label="締め日"
        >
          {closingDayEdit.isEditing ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-600">毎月</span>
              <select
                value={closingDayEdit.value}
                onChange={(e) => {
                  const value = e.target.value;
                  closingDayEdit.saveWithValue(
                    value === "end_of_month" ? value : Number(value),
                  );
                }}
                className="px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                disabled={closingDayEdit.isSaving}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}日
                  </option>
                ))}
                <option value="end_of_month">末日</option>
              </select>
            </div>
          ) : (
            <InlineEditDisplay
              editable={myRole === "owner"}
              onEdit={closingDayEdit.startEditing}
            >
              <p className="font-medium text-slate-800">
                毎月{" "}
                {group.closingDay === "end_of_month"
                  ? "末日"
                  : `${group.closingDay} 日`}
              </p>
            </InlineEditDisplay>
          )}
        </SettingRow>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <Star className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">デフォルトグループ</p>
            <p className="text-[11px] text-slate-400">
              ログイン時に自動でこのグループを開く
            </p>
          </div>
          <Switch
            checked={isDefaultGroup}
            onCheckedChange={handleSetDefault}
            disabled={me === undefined}
          />
        </div>
      </section>

      {/* メンバー（折りたたみ） */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between pr-3">
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            aria-expanded={membersOpen}
            className="flex items-center gap-3 flex-1 px-3 py-2.5 text-left"
          >
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500">メンバー</p>
              <p className="font-medium text-slate-800">{members.length}人</p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-slate-400 transition-transform ${
                membersOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {myRole === "owner" && (
            <div className="ml-2">
              <InviteDialog groupId={group._id} />
            </div>
          )}
        </div>
        {membersOpen && (
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {members.map((member) => (
              <div
                key={member._id}
                className="px-3 py-2 flex items-center gap-3"
              >
                {member.isMe ? (
                  <Popover
                    open={colorPickerOpen}
                    onOpenChange={setColorPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ring-offset-2 hover:ring-2 hover:ring-slate-300 transition-shadow"
                        style={{
                          backgroundColor:
                            memberColors?.[member.userId] ?? "#cbd5e1",
                        }}
                      >
                        {member.displayName.charAt(0)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto">
                      <p className="text-xs text-slate-500 mb-2">
                        カラーを選択
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {MEMBER_COLORS.map((color) => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              updateMemberColor({
                                groupId: group._id,
                                color,
                              });
                              setColorPickerOpen(false);
                            }}
                          >
                            {memberColors?.[member.userId] === color && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                    style={{
                      backgroundColor:
                        memberColors?.[member.userId] ?? "#cbd5e1",
                    }}
                  >
                    {member.displayName.charAt(0)}
                  </div>
                )}
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
                    <InlineEditDisplay
                      editable={member.isMe}
                      onEdit={displayNameEdit.startEditing}
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {member.displayName}
                        {member.isMe && (
                          <span className="ml-1 text-xs text-slate-500">
                            (自分)
                          </span>
                        )}
                      </p>
                    </InlineEditDisplay>
                  )}
                  <p className="text-[11px] text-slate-500">
                    {member.role === "owner" ? "オーナー" : "メンバー"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 分類: カテゴリ + タグ */}
      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <Tag className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">カテゴリ</p>
              <p className="font-medium text-slate-800">
                {categories.length}個
              </p>
            </div>
          </div>
          <CategoryManager groupId={group._id} categories={categories} />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <Tags className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">タグ</p>
              {isGroupPremiumActive ? (
                <p className="font-medium text-slate-800">Premiumで利用可能</p>
              ) : (
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  Premiumプラン限定
                </p>
              )}
            </div>
          </div>
          {isGroupPremiumActive && <TagManager groupId={group._id} />}
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">定期支出</p>
              {isGroupPremiumActive ? (
                <p className="font-medium text-slate-800">
                  家賃・サブスクを自動記録
                </p>
              ) : (
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  Premiumプラン限定
                </p>
              )}
            </div>
          </div>
          {isGroupPremiumActive && (
            <RecurringExpenseManager
              groupId={group._id}
              categories={categories}
              members={members.map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
                isMe: m.isMe,
              }))}
              memberColors={memberColors}
            />
          )}
        </div>
      </section>

      {/* アカウント: プラン + お問い合わせ */}
      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
        <Link
          href="/pricing"
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <CreditCard className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800">プラン・お支払い</p>
            {(() => {
              const trial = readTrialState(subscription?.trialExpiresAt);
              const onStripePaid =
                subscription?.status === "active" ||
                subscription?.status === "trialing";
              if (trial.kind === "active" && !onStripePaid) {
                return (
                  <p className="text-[11px] text-amber-600">
                    Premium トライアル中（残り {trial.daysLeft}日）
                  </p>
                );
              }
              return (
                <p className="text-[11px] text-slate-500">
                  Premiumプランの確認・変更
                </p>
              );
            })()}
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </Link>
        <UsageGuideDialog className="flex items-center gap-3 px-3 py-2.5 w-full text-left hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <HelpCircle className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800">2つの使い方</p>
            <p className="text-[11px] text-slate-500">
              スマホとPCでの使い分けガイド
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </UsageGuideDialog>
        <InquiryDialog>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800">お問い合わせ</p>
              <p className="text-[11px] text-slate-500">
                機能要望・不具合報告など
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </InquiryDialog>
      </section>

      {/* 管理者モード */}
      {me?.isAdmin && subscription && (
        <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">管理者モード</p>
              <p className="text-[11px] text-amber-600">
                {subscription.plan === "premium" ? "Premium" : "Free"} プラン
              </p>
            </div>
            <Switch
              checked={subscription.plan === "premium"}
              onCheckedChange={(checked) =>
                setAdminPlanOverride({
                  plan: checked ? "premium" : "free",
                })
              }
            />
          </div>
          <Link
            href="/admin"
            className="mt-2 block text-center text-sm font-medium text-amber-700 hover:text-amber-900 border border-amber-300 rounded-lg py-1.5 hover:bg-amber-100 transition-colors"
          >
            管理者ダッシュボード →
          </Link>
        </section>
      )}

      {/* 法的情報 */}
      <section className="pt-2">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500">
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
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {APP_VERSION}
        </p>
      </section>
    </div>
  );
}

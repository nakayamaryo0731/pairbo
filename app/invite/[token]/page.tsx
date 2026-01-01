"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  InviteAcceptCard,
  InviteLoginCard,
  InviteErrorCard,
  type InviteError,
} from "@/components/invite";

type PageProps = {
  params: Promise<{ token: string }>;
};

function InvitePageSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm mx-auto">
      {/* アイコン */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full animate-pulse" />
      </div>

      {/* グループ名 */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* 区切り線 */}
      <div className="border-t border-slate-200 my-4" />

      {/* 招待情報 */}
      <div className="space-y-3 mb-6">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
        <div className="h-5 w-32 bg-slate-100 rounded animate-pulse" />
      </div>

      {/* 区切り線 */}
      <div className="border-t border-slate-200 my-4" />

      {/* ボタン */}
      <div className="h-11 w-full bg-slate-100 rounded animate-pulse" />
    </div>
  );
}

export default function InvitePage({ params }: PageProps) {
  const { token } = use(params);
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const invitationResult = useQuery(api.invitations.getByToken, { token });

  // ローディング中
  if (invitationResult === undefined || !isAuthLoaded) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <main className="flex-1 flex items-center justify-center p-4">
          <InvitePageSkeleton />
        </main>
      </div>
    );
  }

  // エラー（無効なトークン、期限切れ、使用済み）
  if ("error" in invitationResult && invitationResult.error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <main className="flex-1 flex items-center justify-center p-4">
          <InviteErrorCard error={invitationResult.error as InviteError} />
        </main>
      </div>
    );
  }

  // 未ログイン時
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <main className="flex-1 flex items-center justify-center p-4">
          <InviteLoginCard
            token={token}
            invitation={invitationResult.invitation}
          />
        </main>
      </div>
    );
  }

  // ログイン済み: 参加確認画面
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex-1 flex items-center justify-center p-4">
        <InviteAcceptCard
          token={token}
          invitation={invitationResult.invitation}
        />
      </main>
    </div>
  );
}

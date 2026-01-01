"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";
import { Home, User, Users } from "lucide-react";

interface InvitationInfo {
  groupId: Id<"groups">;
  groupName: string;
  inviterName: string;
  memberCount: number;
  expiresAt: number;
}

interface InviteAcceptCardProps {
  token: string;
  invitation: InvitationInfo;
}

export function InviteAcceptCard({ token, invitation }: InviteAcceptCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptInvitation = useMutation(api.invitations.accept);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInvitation({ token });

      if (result.alreadyMember) {
        // 既にメンバーの場合もグループ詳細へ
        router.push(`/groups/${result.groupId}`);
      } else if (result.success) {
        router.push(`/groups/${result.groupId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "グループへの参加に失敗しました",
      );
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm mx-auto">
      {/* アイコン */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Home className="h-8 w-8 text-slate-600" />
        </div>
      </div>

      {/* グループ名 */}
      <h1 className="text-xl font-semibold text-center text-slate-800 mb-1">
        「{invitation.groupName}」
      </h1>
      <p className="text-center text-slate-600 mb-6">への招待</p>

      {/* 区切り線 */}
      <div className="border-t border-slate-200 my-4" />

      {/* 招待情報 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-slate-600">
          <User className="h-4.5 w-4.5" />
          <span>{invitation.inviterName}さんからの招待</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Users className="h-4.5 w-4.5" />
          <span>メンバー: {invitation.memberCount}人</span>
        </div>
      </div>

      {/* 区切り線 */}
      <div className="border-t border-slate-200 my-4" />

      {/* エラー表示 */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* ボタン */}
      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={handleAccept}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? "参加中..." : "グループに参加する"}
        </Button>
        <button
          className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
          onClick={handleCancel}
          disabled={isLoading}
        >
          キャンセルして戻る
        </button>
      </div>
    </div>
  );
}

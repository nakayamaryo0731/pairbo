"use client";

import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";

type MemberCardProps = {
  member: {
    _id: Id<"groupMembers">;
    userId: Id<"users">;
    displayName: string;
    avatarUrl?: string;
    role: "owner" | "member";
    joinedAt: number;
    isMe: boolean;
  };
};

export function MemberCard({ member }: MemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3">
      {/* アバター */}
      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt={member.displayName}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-slate-500 text-sm font-medium">
            {member.displayName.charAt(0)}
          </span>
        )}
      </div>

      {/* 名前と役割 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">
            {member.displayName}
          </span>
          {member.isMe && (
            <span className="text-xs text-slate-400">(自分)</span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {member.role === "owner" ? "オーナー" : "メンバー"}
        </span>
      </div>
    </div>
  );
}

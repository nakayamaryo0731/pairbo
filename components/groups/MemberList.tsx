"use client";

import { Id } from "@/convex/_generated/dataModel";
import { MemberCard } from "./MemberCard";

type Member = {
  _id: Id<"groupMembers">;
  userId: Id<"users">;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "member";
  joinedAt: number;
  isMe: boolean;
};

type MemberListProps = {
  members: Member[];
};

export function MemberList({ members }: MemberListProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
      {members.map((member) => (
        <MemberCard key={member._id} member={member} />
      ))}
    </div>
  );
}

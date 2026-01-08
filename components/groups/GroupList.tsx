"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { GroupCard } from "./GroupCard";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { EditGroupDialog } from "./EditGroupDialog";
import { DeleteGroupDialog } from "./DeleteGroupDialog";
import { Button } from "@/components/ui/button";
import { GroupListSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type Group = {
  _id: Id<"groups">;
  name: string;
  memberCount: number;
  myRole: "owner" | "member";
};

export function GroupList() {
  const router = useRouter();
  const groups = useQuery(api.groups.listMyGroups);
  const updateName = useMutation(api.groups.updateName);
  const removeGroup = useMutation(api.groups.remove);

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = async (name: string) => {
    if (!editingGroup) return;
    setIsSaving(true);
    try {
      await updateName({ groupId: editingGroup._id, name });
      setEditingGroup(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    setIsDeleting(true);
    try {
      await removeGroup({ groupId: deletingGroup._id });
      setDeletingGroup(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ローディング中
  if (groups === undefined) {
    return <GroupListSkeleton />;
  }

  // グループがない場合
  if (groups.length === 0) {
    return (
      <EmptyState
        emoji="🏠"
        title="グループがありません"
        description="グループを作成して、家計簿を共有しましょう"
        variant="large"
        action={
          <CreateGroupDialog>
            <Button>グループを作成</Button>
          </CreateGroupDialog>
        }
      />
    );
  }

  // グループ一覧
  return (
    <>
      <div className="space-y-3">
        {groups.map((group) => (
          <GroupCard
            key={group._id}
            name={group.name}
            memberCount={group.memberCount}
            myRole={group.myRole}
            onClick={() => router.push(`/groups/${group._id}`)}
            onEdit={() => setEditingGroup(group)}
            onDelete={() => setDeletingGroup(group)}
            onSettings={() => router.push(`/groups/${group._id}/settings`)}
          />
        ))}
        <CreateGroupDialog>
          <button className="w-full p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors">
            + グループを作成
          </button>
        </CreateGroupDialog>

        {/* 料金プランへのリンク */}
        <div className="text-center pt-4">
          <Link
            href="/pricing"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Premiumプラン・料金について →
          </Link>
        </div>
      </div>

      {editingGroup && (
        <EditGroupDialog
          key={editingGroup._id}
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          group={editingGroup}
          onSave={handleEdit}
          isSaving={isSaving}
        />
      )}

      {deletingGroup && (
        <DeleteGroupDialog
          open={!!deletingGroup}
          onOpenChange={(open) => !open && setDeletingGroup(null)}
          group={deletingGroup}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

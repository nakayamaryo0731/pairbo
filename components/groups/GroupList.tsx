"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GroupCard } from "./GroupCard";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { Button } from "@/components/ui/button";
import { GroupListSkeleton } from "@/components/ui/skeleton";

export function GroupList() {
  const router = useRouter();
  const groups = useQuery(api.groups.listMyGroups);

  // ローディング中
  if (groups === undefined) {
    return <GroupListSkeleton />;
  }

  // グループがない場合
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏠</div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">
          グループがありません
        </h3>
        <p className="text-slate-500 mb-6">
          グループを作成して、家計簿を共有しましょう
        </p>
        <CreateGroupDialog>
          <Button>グループを作成</Button>
        </CreateGroupDialog>
      </div>
    );
  }

  // グループ一覧
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <GroupCard
          key={group._id}
          name={group.name}
          memberCount={group.memberCount}
          myRole={group.myRole}
          onClick={() => router.push(`/groups/${group._id}`)}
        />
      ))}
      <CreateGroupDialog>
        <button className="w-full p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors">
          + グループを作成
        </button>
      </CreateGroupDialog>
    </div>
  );
}

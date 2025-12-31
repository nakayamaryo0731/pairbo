"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GroupSettings } from "@/components/groups/GroupSettings";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function GroupSettingsPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  if (detail === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto">
            <div className="space-y-6">
              {/* ヘッダースケルトン */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
              </div>
              {/* セクションスケルトン */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          <GroupSettings
            group={detail.group}
            members={detail.members}
            categories={detail.categories}
            myRole={detail.myRole}
          />
        </div>
      </main>
    </div>
  );
}

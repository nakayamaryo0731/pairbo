"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GroupDetail } from "@/components/groups";
import { GroupDetailSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, BarChart3 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function GroupDetailPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  const rightIcons = detail ? (
    <div className="flex items-center gap-0.5">
      <Link
        href={`/groups/${detail.group._id}/analytics`}
        className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
      >
        <BarChart3 className="h-5 w-5 text-slate-600" />
      </Link>
      <Link
        href={`/groups/${detail.group._id}/settings`}
        className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Settings className="h-5 w-5 text-slate-600" />
      </Link>
      <div className="w-9 h-9 flex items-center justify-center">
        <UserButton />
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-0.5">
      <div className="w-9 h-9" />
      <div className="w-9 h-9" />
      <div className="w-9 h-9" />
    </div>
  );

  if (detail === undefined) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader
          backHref="/groups?list=true"
          isLoading
          rightElement={rightIcons}
        />
        <main className="p-4">
          <div className="max-w-lg mx-auto">
            <GroupDetailSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        backHref="/groups?list=true"
        title={detail.group.name}
        rightElement={rightIcons}
      />
      <main>
        <div className="max-w-lg mx-auto">
          <GroupDetail group={detail.group} members={detail.members} />
        </div>
      </main>
    </div>
  );
}

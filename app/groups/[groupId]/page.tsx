"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GroupDetail } from "@/components/groups/GroupDetail";
import { GroupDetailSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Settings, ShoppingCart, BarChart3 } from "lucide-react";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function GroupDetailPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  const rightIcons = detail ? (
    <div className="flex items-center gap-1">
      <Link
        href={`/groups/${detail.group._id}/analytics`}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <BarChart3 className="h-5 w-5 text-slate-600" />
      </Link>
      <Link
        href={`/groups/${detail.group._id}/shopping`}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <ShoppingCart className="h-5 w-5 text-slate-600" />
      </Link>
      <Link
        href={`/groups/${detail.group._id}/settings`}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Settings className="h-5 w-5 text-slate-600" />
      </Link>
    </div>
  ) : (
    <div className="flex items-center gap-1">
      <div className="w-9 h-9" />
      <div className="w-9 h-9" />
      <div className="w-9 h-9" />
    </div>
  );

  if (detail === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader backHref="/" isLoading rightElement={rightIcons} />
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto">
            <GroupDetailSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        backHref="/"
        title={detail.group.name}
        rightElement={rightIcons}
      />
      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          <GroupDetail group={detail.group} />
        </div>
      </main>
    </div>
  );
}

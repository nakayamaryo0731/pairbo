"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { GroupDetail } from "@/components/groups/GroupDetail";
import { GroupDetailSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Settings, ShoppingCart } from "lucide-react";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function GroupDetailPage({ params }: PageProps) {
  const { groupId } = use(params);
  const detail = useQuery(api.groups.getDetail, {
    groupId: groupId as Id<"groups">,
  });

  if (detail === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
        </header>
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
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex items-center gap-3 shadow-sm">
        <Link
          href="/"
          className="text-slate-600 hover:text-slate-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-bold text-xl text-slate-800 flex-1">
          {detail.group.name}
        </h1>
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
      </header>

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          <GroupDetail group={detail.group} />
        </div>
      </main>
    </div>
  );
}

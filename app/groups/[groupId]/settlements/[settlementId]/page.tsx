"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SettlementDetail } from "@/components/settlements";
import { PageHeader } from "@/components/ui/PageHeader";

type PageProps = {
  params: Promise<{
    groupId: string;
    settlementId: string;
  }>;
};

export default function SettlementDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const settlementId = resolvedParams.settlementId as Id<"settlements">;
  const groupId = resolvedParams.groupId as Id<"groups">;

  const settlement = useQuery(api.settlements.getById, { settlementId });

  // ローディング中
  if (settlement === undefined) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PageHeader backHref={`/groups/${groupId}`} isLoading />
        <main className="flex-1 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 精算が見つからない
  if (settlement === null) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <PageHeader backHref={`/groups/${groupId}`} title="精算詳細" />
        <main className="flex-1 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center py-12 text-slate-500">
              精算が見つかりません
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader backHref={`/groups/${groupId}`} title="精算詳細" />
      <main className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          <SettlementDetail settlementId={settlementId} />
        </div>
      </main>
    </div>
  );
}

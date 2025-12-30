"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SettlementDetail } from "@/components/settlements";

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

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/groups/${groupId}`}
            className="text-slate-600 hover:text-slate-800"
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
          <h1 className="text-lg font-semibold text-slate-800">精算詳細</h1>
        </div>
      </header>

      {/* コンテンツ */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {settlement === undefined ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto" />
          </div>
        ) : settlement === null ? (
          <div className="text-center py-12 text-slate-500">
            精算が見つかりません
          </div>
        ) : (
          <SettlementDetail settlementId={settlementId} />
        )}
      </div>
    </main>
  );
}

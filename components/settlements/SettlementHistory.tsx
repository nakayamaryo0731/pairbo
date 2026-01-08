"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SettlementCard } from "./SettlementCard";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type SettlementHistoryProps = {
  groupId: Id<"groups">;
};

export function SettlementHistory({ groupId }: SettlementHistoryProps) {
  const settlements = useQuery(api.settlements.listByGroup, { groupId });

  if (settlements === undefined) {
    return <SettlementHistorySkeleton />;
  }

  if (settlements.length === 0) {
    return <EmptyState title="まだ精算履歴がありません" variant="compact" />;
  }

  return (
    <div className="space-y-2">
      {settlements.map((settlement) => (
        <SettlementCard
          key={settlement._id}
          settlement={settlement}
          groupId={groupId}
        />
      ))}
    </div>
  );
}

function SettlementHistorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

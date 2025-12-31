"use client";

import { Skeleton } from "@/components/ui/skeleton";

type ChartSkeletonProps = {
  type: "pie" | "bar";
};

export function ChartSkeleton({ type }: ChartSkeletonProps) {
  if (type === "pie") {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <Skeleton className="h-48 w-48 rounded-full" />
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  const barHeights = [60, 45, 75, 50, 80, 65];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-end justify-between gap-2 h-40">
        {barHeights.map((height, i) => (
          <div key={i} className="flex-1" style={{ height: `${height}%` }}>
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

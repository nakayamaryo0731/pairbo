import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("bg-slate-100 rounded-lg animate-pulse", className)} />
  );
}

export function GroupCardSkeleton() {
  return <Skeleton className="h-20" />;
}

export function GroupListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MemberCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function GroupDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* グループ情報 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* メンバー一覧 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {Array.from({ length: 2 }).map((_, i) => (
            <MemberCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

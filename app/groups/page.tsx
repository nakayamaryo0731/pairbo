"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GroupList } from "@/components/groups";
import { GroupListSkeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/ui/AppHeader";
import { trackEvent } from "@/lib/analytics";

function GroupsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showList = searchParams.get("list") === "true";

  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const [isUserReady, setIsUserReady] = useState(false);

  const me = useQuery(api.users.getMe, isUserReady ? {} : "skip");
  const groups = useQuery(api.groups.listMyGroups, isUserReady ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    ensureUser()
      .then(() => {
        if (!cancelled) {
          setIsUserReady(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      setIsUserReady(false);
    };
  }, [isAuthenticated, ensureUser]);

  // サインアップ直後の GA イベント送信
  useEffect(() => {
    if (searchParams.get("from") === "signup" && isUserReady) {
      trackEvent("sign_up", { method: "clerk" });
      router.replace("/groups", { scroll: false });
    }
  }, [searchParams, isUserReady, router]);

  // 自動遷移処理（?list=true の場合はスキップ）
  useEffect(() => {
    if (showList) return;
    if (groups === undefined || me === undefined) return;
    if (groups.length === 0) return;

    if (groups.length === 1) {
      router.replace(`/groups/${groups[0]._id}`);
      return;
    }

    if (me.defaultGroupId) {
      const defaultGroup = groups.find((g) => g._id === me.defaultGroupId);
      if (defaultGroup) {
        router.replace(`/groups/${defaultGroup._id}`);
      }
    }
  }, [groups, me, router, showList]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    );
  }

  // 未ログインユーザーはサインインページへ
  if (!isAuthenticated) {
    router.replace("/sign-in");
    return null;
  }

  // ローディング中または自動遷移中（?list=true の場合は自動遷移しない）
  const isRedirecting =
    !showList &&
    groups !== undefined &&
    me !== undefined &&
    (groups.length === 1 ||
      (me.defaultGroupId && groups.some((g) => g._id === me.defaultGroupId)));

  if (
    !isUserReady ||
    groups === undefined ||
    me === undefined ||
    isRedirecting
  ) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader rightElement={<UserButton />} />
        <main className="flex-1 p-4">
          <div className="max-w-lg mx-auto">
            <GroupListSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader rightElement={<UserButton />} />

      <main className="flex-1 p-4">
        <div className="max-w-lg mx-auto">
          <GroupList />
        </div>
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
        <div
          className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
          style={{ animationDelay: "0.1s" }}
        ></div>
        <div
          className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GroupsContent />
    </Suspense>
  );
}

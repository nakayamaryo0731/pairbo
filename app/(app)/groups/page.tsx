"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GroupList } from "@/components/groups";
import { GroupListSkeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/ui/AppHeader";
import { NotificationBell } from "@/components/notifications";
import { trackEvent } from "@/lib/analytics";
import { getLastGroupId } from "@/lib/lastGroup";

function GroupsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showList = searchParams.get("list") === "true";

  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);

  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");
  const groups = useQuery(
    api.groups.listMyGroups,
    isAuthenticated ? {} : "skip",
  );

  // 最後に開いたグループへ、クエリ結果を待たずに即遷移する
  const [redirectingToLastGroup] = useState(
    () => !showList && getLastGroupId() !== null,
  );
  useEffect(() => {
    if (!redirectingToLastGroup) return;
    const lastGroupId = getLastGroupId();
    if (lastGroupId) {
      router.replace(`/groups/${lastGroupId}`);
    }
  }, [redirectingToLastGroup, router]);

  // 初回サインイン時のみ: usersレコードを作成（getMeがnull = 未作成）
  const ensureUserCalledRef = useRef(false);
  useEffect(() => {
    if (me !== null || ensureUserCalledRef.current) return;
    ensureUserCalledRef.current = true;
    ensureUser().catch(() => {});
  }, [me, ensureUser]);

  // サインアップ直後の GA イベント送信
  useEffect(() => {
    if (searchParams.get("from") === "signup" && me) {
      trackEvent("sign_up", { method: "clerk" });
      router.replace("/groups", { scroll: false });
    }
  }, [searchParams, me, router]);

  // 自動遷移処理（?list=true の場合はスキップ）
  useEffect(() => {
    if (showList || redirectingToLastGroup) return;
    if (groups === undefined || !me) return;
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
  }, [groups, me, router, showList, redirectingToLastGroup]);

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

  // ローディング中または自動遷移中（?list=true の場合は自動遷移しない）
  const isRedirecting =
    redirectingToLastGroup ||
    (!showList &&
      groups !== undefined &&
      !!me &&
      (groups.length === 1 ||
        (me.defaultGroupId &&
          groups.some((g) => g._id === me.defaultGroupId))));

  // me == null はユーザー作成中（ensureUser実行中）
  if (groups === undefined || me == null || isRedirecting) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader
          rightElement={
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserButton />
            </div>
          }
        />
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

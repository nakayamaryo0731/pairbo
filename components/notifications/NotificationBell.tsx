"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Bell } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  getAutoOpenRelease,
  getVisibleReleasesDesc,
  hasUnreadRelease,
  type Release,
  type ReleaseAudienceContext,
} from "@/lib/releases";
import { ReleaseModal } from "./ReleaseModal";
import { ReleaseListModal } from "./ReleaseListModal";

type View =
  { type: "closed" } | { type: "list" } | { type: "detail"; release: Release };

export function NotificationBell() {
  const me = useQuery(api.users.getMe);
  const subscription = useQuery(api.subscriptions.getMySubscription);

  if (!me || !subscription) {
    return <div className="w-11 h-11" aria-hidden />;
  }

  return <NotificationBellReady me={me} subscription={subscription} />;
}

type MeData = NonNullable<ReturnType<typeof useQuery<typeof api.users.getMe>>>;
type SubscriptionData = NonNullable<
  ReturnType<typeof useQuery<typeof api.subscriptions.getMySubscription>>
>;

function NotificationBellReady({
  me,
  subscription,
}: {
  me: MeData;
  subscription: SubscriptionData;
}) {
  const markRead = useMutation(api.users.markReleasesRead);

  const audienceCtx: ReleaseAudienceContext = {
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd ?? null,
  };
  const trialClaimed = subscription.trialExpiresAt != null;

  // 自動オープン判定は mount 直後に1回だけ。クエリ解決後にこのコンポーネントが
  // マウントされるため、lazy initializer で安全に評価できる。
  const [view, setView] = useState<View>(() => {
    const auto = getAutoOpenRelease({
      ctx: audienceCtx,
      lastSeenReleaseAt: me.lastSeenReleaseAt,
      trialClaimed,
    });
    return auto ? { type: "detail", release: auto } : { type: "closed" };
  });

  const all = getVisibleReleasesDesc(audienceCtx);

  if (all.length === 0) {
    return <div className="w-11 h-11" aria-hidden />;
  }

  const latest = all[0];
  const hasUnread = hasUnreadRelease(me.lastSeenReleaseAt, all);

  const handleOpen = () => {
    setView({ type: "detail", release: latest });
    markRead().catch(() => {});
  };

  // 既読化は閉じた時に行う。開いた瞬間に既読化すると、ログイン直後の
  // ページ遷移で再マウントされた際に initializer が既読と判定し、
  // 自動表示中のモーダルが一瞬で消えてしまう
  const handleClose = () => {
    setView({ type: "closed" });
    markRead().catch(() => {});
  };
  const handleShowList = () => setView({ type: "list" });
  const handleItemClick = (r: Release) =>
    setView({ type: "detail", release: r });

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative w-11 h-11 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
        aria-label={hasUnread ? "新着のお知らせ" : "お知らせ"}
      >
        <Bell className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {view.type === "list" && (
        <ReleaseListModal
          releases={all}
          onClose={handleClose}
          onItemClick={handleItemClick}
        />
      )}

      {view.type === "detail" && (
        <ReleaseModal
          release={view.release}
          trialClaimed={trialClaimed}
          onClose={handleClose}
          onBack={handleShowList}
        />
      )}
    </>
  );
}

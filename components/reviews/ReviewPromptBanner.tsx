"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MessageCircleHeart, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { ReviewDialog } from "./ReviewDialog";

type Props = {
  groupId: Id<"groups">;
};

/**
 * 使い続けているふたり組にだけ出す、感想のお願いバナー
 *
 * 送信するとサーバー側で対象外になりバナーは消えるが、
 * お礼の画面を出し続けるためダイアログはバナーと切り離して描画する
 */
export function ReviewPromptBanner({ groupId }: Props) {
  const shouldShow = useQuery(api.reviews.shouldShowPrompt, { groupId });
  const closePrompt = useMutation(api.reviews.closePrompt);
  const [dismissed, setDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const shownTrackedRef = useRef(false);

  const visible = shouldShow === true && !dismissed;

  useEffect(() => {
    if (!visible || shownTrackedRef.current) return;
    shownTrackedRef.current = true;
    trackEvent("review_prompt_shown");
  }, [visible]);

  const handleOpen = () => {
    setDialogOpen(true);
    trackEvent("review_prompt_opened");
  };

  const handleDismiss = () => {
    setDismissed(true);
    trackEvent("review_prompt_dismissed");
    closePrompt().catch((err) => {
      console.error("Failed to close review prompt:", err);
    });
  };

  return (
    <>
      {visible && (
        <div className="px-4 pt-3">
          <div className="flex items-center rounded-lg bg-rose-50 border border-rose-100">
            <button
              type="button"
              onClick={handleOpen}
              className="flex flex-1 min-w-0 items-center gap-2 px-4 py-3 text-left rounded-l-lg hover:bg-rose-100 transition-colors"
            >
              <div className="w-9 h-9 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                <MessageCircleHeart className="h-4 w-4 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-rose-900">
                  Pairboの感想を聞かせてください
                </p>
                <p className="text-[11px] text-rose-700">1分ほどで終わります</p>
              </div>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="閉じる"
              className="w-11 h-11 mr-1 flex items-center justify-center shrink-0 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <ReviewDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

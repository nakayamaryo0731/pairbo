"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type InviteDialogProps = {
  groupId: Id<"groups">;
  groupName: string;
};

export function InviteDialog({ groupId, groupName }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createInvitation = useMutation(api.groups.createInvitation);

  const handleCreateInvite = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createInvitation({ groupId });
      const baseUrl = window.location.origin;
      setInviteUrl(`${baseUrl}/invite/${result.token}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "招待リンクの作成に失敗しました",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${groupName}への招待`,
          text: `${groupName}に参加しませんか？`,
          url: inviteUrl,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // ダイアログを閉じる時にリセット
      setInviteUrl(null);
      setError(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" x2="19" y1="8" y2="14" />
            <line x1="22" x2="16" y1="11" y2="11" />
          </svg>
          招待
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>メンバーを招待</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {!inviteUrl ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-600 mb-4">
                招待リンクを作成して、メンバーを招待できます。
                <br />
                リンクの有効期限は7日間です。
              </p>
              <Button onClick={handleCreateInvite} disabled={isLoading}>
                {isLoading ? "作成中..." : "招待リンクを作成"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-xs text-slate-500 mb-1">招待リンク</p>
                <p className="text-sm text-slate-800 break-all font-mono">
                  {inviteUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopy}
                >
                  {copied ? "コピーしました!" : "コピー"}
                </Button>
                <Button className="flex-1" onClick={handleShare}>
                  シェア
                </Button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                有効期限: 7日間
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

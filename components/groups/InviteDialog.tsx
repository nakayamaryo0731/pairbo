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
import { UserPlus } from "lucide-react";
import { useFormDialog } from "@/hooks/useFormDialog";
import { trackEvent } from "@/lib/analytics";

type InviteDialogProps = {
  groupId: Id<"groups">;
  groupName: string;
};

export function InviteDialog({ groupId, groupName }: InviteDialogProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { open, handleOpenChange, isLoading, error, execute } = useFormDialog({
    onReset: () => {
      setInviteUrl(null);
      setCopied(false);
    },
  });

  const createInvitation = useMutation(api.groups.createInvitation);

  const handleCreateInvite = async () => {
    const result = await execute(
      async () => {
        const invitation = await createInvitation({ groupId });
        const baseUrl = window.location.origin;
        return `${baseUrl}/invite/${invitation.token}`;
      },
      { closeOnSuccess: false },
    );

    if (result.success && result.data) {
      setInviteUrl(result.data);
      trackEvent("invite_sent");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1 transition-colors">
          <UserPlus className="h-4 w-4" />
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

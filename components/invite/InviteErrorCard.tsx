"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export type InviteError = "invalid_token" | "expired" | "already_used";

interface InviteErrorCardProps {
  error: InviteError;
}

const errorMessages: Record<InviteError, { title: string; details: string[] }> =
  {
    invalid_token: {
      title: "招待リンクが無効です",
      details: ["リンクが間違っている", "招待が取り消された"],
    },
    expired: {
      title: "招待リンクの有効期限が切れています",
      details: [
        "招待リンクは7日間有効です",
        "新しい招待リンクを依頼してください",
      ],
    },
    already_used: {
      title: "この招待リンクは既に使用されています",
      details: [
        "招待リンクは1回限り有効です",
        "新しい招待リンクを依頼してください",
      ],
    },
  };

export function InviteErrorCard({ error }: InviteErrorCardProps) {
  const { title, details } = errorMessages[error];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 w-full max-w-sm mx-auto">
      {/* アイコン */}
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
          <TriangleAlert className="h-8 w-8 text-amber-500" />
        </div>
      </div>

      {/* エラータイトル */}
      <h1 className="text-xl font-semibold text-center text-slate-800 mb-4">
        {title}
      </h1>

      {/* エラー詳細 */}
      <ul className="text-slate-600 space-y-1 mb-6">
        {details.map((detail, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-slate-400">・</span>
            <span>{detail}</span>
          </li>
        ))}
      </ul>

      {/* 区切り線 */}
      <div className="border-t border-slate-200 my-4" />

      {/* ボタン */}
      <Link href="/">
        <Button variant="outline" className="w-full" size="lg">
          ホームに戻る
        </Button>
      </Link>
    </div>
  );
}

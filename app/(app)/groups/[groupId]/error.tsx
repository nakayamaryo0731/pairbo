"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearLastGroupId } from "@/lib/lastGroup";

/**
 * グループ配下のエラー境界。
 * 削除済み・脱退済みグループへのアクセス（lastGroupIdが古い場合など）は
 * 記録をクリアしてグループ一覧に戻す。
 */
export default function GroupError() {
  const router = useRouter();

  useEffect(() => {
    clearLastGroupId();
    router.replace("/groups?list=true");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">グループ一覧に戻ります...</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { Slider as SliderPrimitive } from "radix-ui";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { MemberColorDot } from "@/components/ui/MemberColorDot";
import { CategoryIcon } from "./CategoryIcon";
import { getErrorMessage } from "@/lib/errors";
import { trackEvent } from "@/lib/analytics";
import { MEMBER_COLORS } from "@/lib/userColors";
import {
  EVEN_PAIR_RATIO,
  firstPairRatio,
  toPairRatios,
  type Ratios,
} from "@/lib/splitRatios";

type Category = {
  _id: Id<"categories">;
  name: string;
  icon: string;
  defaultRatios?: Ratios;
};

type Member = {
  userId: Id<"users">;
  displayName: string;
};

type CategoryRatioManagerProps = {
  categories: Category[];
  /** 2人グループのメンバー（参加順） */
  members: Member[];
  memberColors?: Record<string, string>;
  /** ダイアログを開くトリガー要素 */
  children: React.ReactNode;
};

export function CategoryRatioManager({
  categories,
  members,
  memberColors,
  children,
}: CategoryRatioManagerProps) {
  const setDefaultRatios = useMutation(api.categories.setDefaultRatios);
  // 保存完了までスライダーが保存前の値に戻らないよう、操作中の値を保持する
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const [first, second] = members;
  if (!first || !second) return null;

  const firstColor = memberColors?.[first.userId] ?? MEMBER_COLORS[0];
  const secondColor = memberColors?.[second.userId] ?? MEMBER_COLORS[1];

  const handleCommit = async (categoryId: Id<"categories">, value: number) => {
    setError(null);
    try {
      await setDefaultRatios({
        categoryId,
        ratios: toPairRatios(value, [first.userId, second.userId]),
      });
      trackEvent("set_category_default_ratio", {
        is_even: value === EVEN_PAIR_RATIO,
      });
    } catch (err) {
      setError(getErrorMessage(err, "保存に失敗しました"));
    } finally {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>カテゴリ別の負担割合</DialogTitle>
          <DialogDescription>
            支出を記録するときにカテゴリを選ぶと、この割合が入力されます。
          </DialogDescription>
        </DialogHeader>

        <ErrorAlert message={error} className="p-2 rounded border-0" />

        <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-white flex justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <MemberColorDot color={firstColor} />
            {first.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            {second.displayName}
            <MemberColorDot color={secondColor} />
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {categories.map((category) => {
            const value =
              drafts[category._id] ??
              firstPairRatio(category.defaultRatios, first.userId);
            const isEven = value === EVEN_PAIR_RATIO;
            return (
              <div key={category._id} className="py-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <CategoryIcon
                    name={category.icon}
                    size="sm"
                    className="text-slate-600"
                  />
                  <span className="flex-1 text-sm text-slate-800">
                    {category.name}
                  </span>
                  <span
                    className={`text-sm tabular-nums ${
                      isEven ? "text-slate-400" : "font-medium text-slate-800"
                    }`}
                  >
                    {value}:{100 - value}
                  </span>
                </div>
                <SliderPrimitive.Root
                  value={[value]}
                  onValueChange={([v]) =>
                    setDrafts((prev) => ({ ...prev, [category._id]: v }))
                  }
                  onValueCommit={([v]) => handleCommit(category._id, v)}
                  min={0}
                  max={100}
                  step={5}
                  aria-label={`${category.name}の負担割合`}
                  className="relative flex w-full touch-none select-none items-center py-1"
                >
                  <SliderPrimitive.Track
                    className="relative h-2 w-full grow overflow-hidden rounded-full"
                    style={{ backgroundColor: secondColor }}
                  >
                    <SliderPrimitive.Range
                      className="absolute h-full"
                      style={{ backgroundColor: firstColor }}
                    />
                  </SliderPrimitive.Track>
                  <span className="pointer-events-none absolute left-1/2 h-3.5 w-px -translate-x-1/2 bg-slate-400" />
                  <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-slate-400 bg-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300" />
                </SliderPrimitive.Root>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { Id } from "@/convex/_generated/dataModel";

export type Ratios = { userId: Id<"users">; ratio: number }[];

/** 2人の割合で「均等」を表す1人目の% */
export const EVEN_PAIR_RATIO = 50;

/** メンバーで均等な割合（端数は先頭のメンバー） */
export function equalRatioMap(
  memberIds: Id<"users">[],
): Map<Id<"users">, number> {
  const base = Math.floor(100 / memberIds.length);
  const remainder = 100 - base * memberIds.length;
  return new Map(
    memberIds.map((id, i) => [id, base + (i === 0 ? remainder : 0)]),
  );
}

/** 保存済みの割合を全メンバー分の Map にする（含まれないメンバーは0%） */
export function toRatioMap(
  ratios: Ratios,
  memberIds: Id<"users">[],
): Map<Id<"users">, number> {
  return new Map(
    memberIds.map((id) => [
      id,
      ratios.find((r) => r.userId === id)?.ratio ?? 0,
    ]),
  );
}

/** 2人グループの保存済み割合から1人目の%を取り出す（未設定は均等） */
export function firstPairRatio(
  ratios: Ratios | undefined,
  firstMemberId: Id<"users">,
): number {
  return (
    ratios?.find((r) => r.userId === firstMemberId)?.ratio ?? EVEN_PAIR_RATIO
  );
}

/** 1人目の%から2人分の割合を作る。均等は未設定（null）として扱う */
export function toPairRatios(
  firstRatio: number,
  [firstMemberId, secondMemberId]: [Id<"users">, Id<"users">],
): Ratios | null {
  if (firstRatio === EVEN_PAIR_RATIO) return null;
  return [
    { userId: firstMemberId, ratio: firstRatio },
    { userId: secondMemberId, ratio: 100 - firstRatio },
  ];
}

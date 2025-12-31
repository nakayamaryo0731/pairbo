import type { Id } from "../../_generated/dataModel";
import type { SplitDetails } from "./types";

/**
 * 支出分割エラー
 */
export class SplitMemberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitMemberError";
  }
}

/**
 * 支出分割の対象メンバーIDを決定する
 *
 * @param splitDetails - 分割方法の詳細
 * @param allMemberIds - グループの全メンバーID
 * @returns 分割対象のメンバーID配列
 * @throws SplitMemberError - メンバーがグループに所属していない場合
 */
export function resolveTargetMemberIds(
  splitDetails: SplitDetails,
  allMemberIds: Id<"users">[],
): Id<"users">[] {
  let targetMemberIds: Id<"users">[];

  if (splitDetails.method === "equal" && splitDetails.memberIds) {
    // 選択メンバーがグループメンバーであることを確認
    for (const id of splitDetails.memberIds) {
      if (!allMemberIds.includes(id)) {
        throw new SplitMemberError(
          "選択されたメンバーがグループに所属していません",
        );
      }
    }
    targetMemberIds = splitDetails.memberIds;
  } else if (splitDetails.method === "ratio") {
    targetMemberIds = splitDetails.ratios.map((r) => r.userId);
  } else if (splitDetails.method === "amount") {
    targetMemberIds = splitDetails.amounts.map((a) => a.userId);
  } else if (splitDetails.method === "full") {
    targetMemberIds = [splitDetails.bearerId];
  } else {
    // equal で memberIds 未指定の場合は全員
    targetMemberIds = allMemberIds;
  }

  if (targetMemberIds.length === 0) {
    throw new SplitMemberError("少なくとも1人のメンバーを選択してください");
  }

  return targetMemberIds;
}

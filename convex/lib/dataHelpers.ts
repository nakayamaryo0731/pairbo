import type { DatabaseReader } from "../_generated/server";
import type { Doc, Id, TableNames } from "../_generated/dataModel";

/**
 * エンティティを取得し、存在しない場合はエラーをスロー
 *
 * @param ctx - データベースコンテキスト
 * @param id - 取得するエンティティのID
 * @param errorMessage - エンティティが存在しない場合のエラーメッセージ
 * @returns エンティティ
 * @throws Error - エンティティが存在しない場合
 */
export async function getOrThrow<T extends TableNames>(
  ctx: { db: DatabaseReader },
  id: Id<T>,
  errorMessage: string,
): Promise<Doc<T>> {
  const entity = await ctx.db.get(id);
  if (!entity) {
    throw new Error(errorMessage);
  }
  return entity;
}

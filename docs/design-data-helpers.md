# データヘルパー関数の設計

## 概要

Convex API ハンドラーで繰り返し使用されるデータ取得・エンリッチメントパターンを共通化し、コードの重複を削減する。

## 目的

1. **コード削減**: 約280行の重複コードを削減
2. **一貫性**: エラーメッセージとフォールバック値の統一
3. **保守性**: 変更箇所の一元化
4. **型安全性**: 共通の型定義による型安全性の向上

## 実装内容

### 1. getOrThrow ヘルパー

エンティティ取得時のnullチェックを共通化。

```typescript
// convex/lib/dataHelpers.ts
async function getOrThrow<T extends TableNames>(
  ctx: { db: DatabaseReader },
  id: Id<T>,
  errorMessage: string,
): Promise<Doc<T>>;
```

**適用箇所（65箇所以上）**:

- グループ取得: expenses.ts, settlements.ts, groups.ts, analytics.ts
- カテゴリ取得: expenses.ts, categories.ts
- 支出取得: expenses.ts
- 精算取得: settlements.ts
- 買い物アイテム取得: shoppingList.ts

### 2. エンリッチメントヘルパー

ユーザー・カテゴリ情報の付加を共通化。

```typescript
// convex/lib/enrichment.ts

// フォールバック定数
const FALLBACK = {
  USER_NAME: "不明なユーザー",
  CATEGORY_NAME: "不明なカテゴリ",
  CATEGORY_ICON: "❓",
  GROUP_NAME: "不明なグループ",
} as const;

// ユーザー情報型
interface UserInfo {
  _id: Id<"users">;
  displayName: string;
  avatarUrl?: string;
}

// カテゴリ情報型
interface CategoryInfo {
  _id: Id<"categories">;
  name: string;
  icon: string;
}

// ユーザー情報のMap作成
async function createUserMap(
  ctx: { db: DatabaseReader },
  userIds: Id<"users">[],
): Promise<Map<Id<"users">, UserInfo>>;

// カテゴリ情報のMap作成
async function createCategoryMap(
  ctx: { db: DatabaseReader },
  categoryIds: Id<"categories">[],
): Promise<Map<Id<"categories">, CategoryInfo>>;

// ユーザー情報取得（単一）
function getUserInfo(user: Doc<"users"> | null): UserInfo | null;

// ユーザー名取得（フォールバック付き）
function getUserDisplayName(user: Doc<"users"> | null): string;
```

**適用箇所**:

- expenses.ts: listByGroup, getById, listByPeriod
- settlements.ts: getPreview, getById
- shoppingList.ts: listPurchasedByMonth
- invitations.ts: getByToken
- groups.ts: listMyGroups, getDetail

## ファイル構成

```
convex/lib/
├── dataHelpers.ts      # getOrThrow
└── enrichment.ts       # エンリッチメントヘルパー + 定数
```

## やらないこと

- バリデーションエラー処理の共通化（Phase 2で実施）
- listByGroup/listByPeriodの完全な統合（影響範囲が大きい）

## 懸念事項

- `getOrThrow`の命名: `getRequired`、`mustGet`なども候補
- エンリッチメントヘルパーの粒度: 細かすぎると使いにくい

## 参考

- PR #31: 認可ヘルパー関数の共通化
- PR #32: クエリヘルパー関数の共通化

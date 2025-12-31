# Oaiko - セッション引き継ぎ書

> 最終更新: 2024-12-31
> ステータス: 支出編集・削除機能実装完了

---

## 現在の状況サマリー

**完了したこと**

- 技術選定（Next.js + Convex）
- プロダクト名決定（Oaiko = おあいこ）
- MVP機能仕様策定
- プロジェクト初期セットアップ
- Convexアカウント連携・開発環境セットアップ
- デプロイフロー確立（Vercel + Convex）
- GitHub Actions CI/CD構築
- pnpmへ移行
- ドメインモデル設計
- 認証方式決定・実装（Clerk）
- DBスキーマ実装
- グループ機能実装（作成、一覧、詳細、招待）
- 支出機能実装（登録、一覧、期間別表示、編集、削除）
- 精算機能実装（プレビュー、確定、履歴）
- 招待機能実装（トークン生成、受け入れ）
- シードデータ機能
- テスト実装（ユニットテスト）
- 構造化ロガー

**今回完了した機能: 支出編集・削除**

- ドメイン層: `getSettlementYearMonthForDate`（日付から精算期間を逆引き）
- API: `expenses.update` / `expenses.remove` mutation
- API: `expenses.getById` に `isSettled` フラグ追加
- UI: `ExpenseDetail` コンポーネント（詳細表示）
- UI: `DeleteExpenseDialog` コンポーネント（削除確認）
- UI: `ExpenseForm` 編集モード対応
- ページ: 支出詳細ページ `/groups/[groupId]/expenses/[expenseId]`
- ページ: 支出編集ページ `/groups/[groupId]/expenses/[expenseId]/edit`
- テスト: update/remove mutation のユニットテスト追加

**次にやること（MVP残タスク）**

1. 分析機能（カテゴリ別円グラフ、月別推移）
2. 買い物リスト機能
3. PWA対応
4. UIブラッシュアップ

---

## プロジェクト情報

### 基本情報

| 項目         | 内容                                             |
| ------------ | ------------------------------------------------ |
| プロダクト名 | Oaiko（おあいこ）                                |
| 名前の由来   | お相子 = 精算して貸し借りなし                    |
| コンセプト   | 割り勘・傾斜折半ができる共有家計簿               |
| ターゲット   | 同棲カップル、夫婦、シェアハウス住人             |
| 差別化       | 割り勘・傾斜折半 + プラットフォーム非依存（Web） |

### 技術スタック

```
Frontend: Next.js 16 (App Router) + React 19
Backend: Convex 1.31 (DB + API + リアルタイム)
Styling: Tailwind CSS 4
Language: TypeScript 5
Auth: Clerk
Deploy: Vercel + Convex
```

---

## プロジェクト構造

```
/Users/ron/Dev/oaiko/
├── app/                    # Next.js App Router
│   ├── groups/[groupId]/   # グループ詳細
│   │   ├── page.tsx
│   │   ├── expenses/       # 支出関連
│   │   │   ├── new/        # 支出登録
│   │   │   └── [expenseId]/
│   │   │       ├── page.tsx    # 支出詳細
│   │   │       └── edit/       # 支出編集
│   │   └── settlements/    # 精算関連
│   ├── invite/[token]/     # 招待受け入れ
│   ├── sign-in/            # サインイン
│   └── sign-up/            # サインアップ
├── components/
│   ├── expenses/           # 支出コンポーネント
│   │   ├── ExpenseCard.tsx
│   │   ├── ExpenseDetail.tsx
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── DeleteExpenseDialog.tsx
│   │   └── SplitMethodSelector.tsx
│   ├── groups/             # グループコンポーネント
│   ├── settlements/        # 精算コンポーネント
│   └── invite/             # 招待コンポーネント
├── convex/                 # Convex バックエンド
│   ├── schema.ts           # DBスキーマ
│   ├── expenses.ts         # 支出API
│   ├── groups.ts           # グループAPI
│   ├── settlements.ts      # 精算API
│   ├── invitations.ts      # 招待API
│   ├── users.ts            # ユーザーAPI
│   ├── domain/             # ドメインロジック
│   │   ├── expense/        # 支出ドメイン
│   │   ├── group/          # グループドメイン
│   │   ├── settlement/     # 精算ドメイン
│   │   ├── invitation/     # 招待ドメイン
│   │   └── shared/         # 共通ロジック
│   ├── lib/
│   │   ├── auth.ts         # 認証ミドルウェア
│   │   ├── logger.ts       # 構造化ロガー
│   │   ├── seedData.ts     # シードデータ
│   │   └── validators.ts   # バリデータ
│   └── __tests__/          # ユニットテスト
├── docs/                   # 設計ドキュメント
│   ├── design-*.md         # 各機能の設計書
│   └── mvp-features.md
├── CLAUDE.md               # プロジェクト概要
└── HANDOVER.md             # この引き継ぎ書
```

---

## 実装済み機能

### 支出機能

- **登録**: 金額、カテゴリ、支払者、日付、メモ、負担方法
- **一覧**: 期間別表示（精算期間ナビゲーション付き）
- **詳細**: 負担配分、精算状態表示
- **編集**: フォーム再利用、精算済み支出は編集不可
- **削除**: 確認ダイアログ付き、精算済み支出は削除不可

### 負担方法

| 値     | 説明                 |
| ------ | -------------------- |
| equal  | 均等分割             |
| ratio  | 傾斜分割（割合指定） |
| amount | 傾斜分割（金額指定） |
| full   | 全額負担             |

### 精算機能

- **プレビュー**: 精算額計算、最小送金数アルゴリズム
- **確定**: オーナーのみ実行可能
- **履歴**: 過去の精算一覧・詳細

---

## デプロイ情報

| 環境           | URL                                      |
| -------------- | ---------------------------------------- |
| 本番（Vercel） | https://oaiko.vercel.app                 |
| Convex本番     | https://hip-moose-165.convex.cloud       |
| GitHub         | https://github.com/nakayamaryo0731/oaiko |

---

## 開発コマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test:run

# 型チェック・lint・フォーマット
pnpm typecheck && pnpm lint && pnpm format:check

# シードデータ投入
npx convex run seed:seedTestData
```

---

## 次のセッションでやること

### 1. 分析機能

- カテゴリ別円グラフ
- 月別推移グラフ

### 2. 買い物リスト機能

- アイテム追加・チェック
- 支出連携
- 履歴表示

### 3. PWA対応

- Service Worker
- オフライン対応

---

## 注意事項

- `convex/_generated/` は自動生成なので編集しない
- PRマージ前にローカルで `pnpm typecheck && pnpm lint && pnpm format:check` を実行
- 機能実装後は必ずテストを追加
- シードデータの更新要否を確認

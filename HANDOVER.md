# Oaiko - セッション引き継ぎ書

> 最終更新: 2026-01-01
> ステータス: MVP完了、マネタイズ機能実装中

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
- 精算機能実装（プレビュー、確定、履歴、支払いマーク）
- 招待機能実装（トークン生成、受け入れ、エラーハンドリング）
- 分析機能実装（カテゴリ別円グラフ、月別推移棒グラフ）
- 買い物リスト機能実装（リスト、履歴、支出連携）
- カテゴリ管理機能（作成、編集、削除）
- PWA対応（Service Worker、オフラインページ、アイコン）
- シードデータ機能
- テスト実装（ユニットテスト 276件）
- 構造化ロガー
- バックエンドリファクタリング（認可・クエリ・データヘルパー共通化）

**直近の実装: マネタイズ機能**

- Stripeサブスクリプション基盤（PR #58）
  - subscriptionsテーブル追加
  - Stripe Checkout Session / Customer Portal
  - Webhook処理（checkout完了、サブスク更新、解約、決済失敗）
  - サブスクリプション状態管理
  - Pro判定ヘルパー関数
- 料金ページ（/pricing）- 月払い/年払い切り替え、FAQ付き
- 広告バナー（Freeユーザー向け）
  - Proプランへの誘導バナー
  - グループ詳細ページでは非表示（TabNavigationと競合回避）
  - Proユーザーは広告非表示

**プラン設計**

- Free: 基本機能 + 広告表示
- Pro: ¥300/月 or ¥2,400/年（広告非表示、詳細分析、データエクスポート予定）
- 注: グループ・メンバー数制限は廃止（同棲カップル向けアプリのため不要）

**次のステップ**

1. Pro限定機能の実装（詳細分析、データエクスポート）
2. 広告のA/Bテスト・文言最適化

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
PWA: Serwist
Deploy: Vercel + Convex
```

---

## プロジェクト構造

```
/Users/ron/Dev/oaiko/
├── app/                    # Next.js App Router
│   ├── manifest.ts         # PWA マニフェスト
│   ├── sw.ts               # Service Worker
│   ├── groups/[groupId]/   # グループ詳細
│   │   ├── page.tsx        # タブUI（支出/精算/分析）
│   │   ├── settings/       # グループ設定
│   │   ├── shopping/       # 買い物リスト
│   │   ├── expenses/       # 支出関連
│   │   │   ├── new/        # 支出登録
│   │   │   └── [expenseId]/
│   │   │       ├── page.tsx    # 支出詳細
│   │   │       └── edit/       # 支出編集
│   │   └── settlements/    # 精算関連
│   │       └── [settlementId]/ # 精算詳細
│   ├── invite/[token]/     # 招待受け入れ
│   ├── offline/            # オフラインページ
│   ├── sign-in/            # サインイン
│   ├── sign-up/            # サインアップ
│   └── pricing/            # 料金プランページ
├── components/
│   ├── ads/                # 広告コンポーネント
│   ├── analytics/          # 分析コンポーネント
│   │   ├── AnalyticsSection.tsx
│   │   ├── CategoryPieChart.tsx
│   │   └── MonthlyTrendChart.tsx
│   ├── categories/         # カテゴリコンポーネント
│   ├── expenses/           # 支出コンポーネント
│   ├── groups/             # グループコンポーネント
│   ├── invite/             # 招待コンポーネント
│   ├── settlements/        # 精算コンポーネント
│   ├── shopping/           # 買い物リストコンポーネント
│   └── ui/                 # UIコンポーネント
├── convex/                 # Convex バックエンド
│   ├── schema.ts           # DBスキーマ
│   ├── analytics.ts        # 分析API
│   ├── categories.ts       # カテゴリAPI
│   ├── expenses.ts         # 支出API
│   ├── groups.ts           # グループAPI
│   ├── invitations.ts      # 招待API
│   ├── settlements.ts      # 精算API
│   ├── shoppingList.ts     # 買い物リストAPI
│   ├── users.ts            # ユーザーAPI
│   ├── domain/             # ドメインロジック
│   ├── http.ts             # Stripe Webhook
│   ├── subscriptions.ts    # サブスクリプションAPI
│   ├── lib/
│   │   ├── auth.ts         # 認証ミドルウェア
│   │   ├── authorization.ts # 認可ヘルパー
│   │   ├── dataHelpers.ts  # データ取得ヘルパー
│   │   ├── enrichment.ts   # エンリッチメントヘルパー
│   │   ├── expenseHelper.ts # 支出ヘルパー
│   │   ├── groupHelper.ts  # グループヘルパー
│   │   ├── logger.ts       # 構造化ロガー
│   │   ├── seedData.ts     # シードデータ
│   │   ├── subscription.ts # Pro判定ヘルパー
│   │   └── validators.ts   # 共通バリデータ
│   └── __tests__/          # ユニットテスト
├── public/
│   ├── icons/              # PWAアイコン
│   └── sw.js               # 生成されたService Worker
├── docs/                   # 設計ドキュメント
├── CLAUDE.md               # プロジェクト概要
└── HANDOVER.md             # この引き継ぎ書
```

---

## 実装済み機能

### 支出機能

- **登録**: 金額、カテゴリ、支払者、日付、メモ、負担方法、買い物リスト連携
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
- **支払いマーク**: 受取人が支払い完了をマーク

### 分析機能

- **カテゴリ別**: 円グラフで支出内訳を表示
- **月別推移**: 棒グラフで過去6ヶ月の推移を表示

### 買い物リスト機能

- **リスト**: アイテム追加・削除・購入マーク
- **履歴**: 月別の購入履歴表示
- **支出連携**: 買い物リストから支出記録へ連携

### 招待機能

- **トークン生成**: オーナーが招待リンクを生成
- **受け入れ**: トークン検証、グループ参加
- **エラー対応**: 期限切れ、使用済み、無効トークン

### PWA機能

- **インストール可能**: ホーム画面に追加可能
- **オフライン対応**: オフラインページ表示
- **キャッシュ**: Serwistによるランタイムキャッシュ

### サブスクリプション機能

- **プラン**: Free / Pro（¥300/月 or ¥2,400/年）
- **決済**: Stripe Checkout
- **管理**: Stripe Customer Portal
- **状態管理**: active, canceled, past_due, trialing
- **API**: `getMySubscription`, `createCheckoutSession`, `createPortalSession`

---

## デプロイ情報

| 環境           | URL                                      |
| -------------- | ---------------------------------------- |
| 本番（Vercel） | https://oaiko.vercel.app                 |
| Convex本番     | https://hip-moose-165.convex.cloud       |
| GitHub         | https://github.com/nakayamaryo0731/oaiko |
| Stripe         | https://dashboard.stripe.com             |

### Stripe環境変数（Convexに設定済み）

| 変数名                | 説明                          |
| --------------------- | ----------------------------- |
| STRIPE_SECRET_KEY     | Stripeシークレットキー        |
| STRIPE_WEBHOOK_SECRET | Webhook署名検証用シークレット |
| STRIPE_PRICE_MONTHLY  | 月額プランのPrice ID          |
| STRIPE_PRICE_YEARLY   | 年額プランのPrice ID          |

### Stripe Webhook

エンドポイント: `https://hip-moose-165.convex.site/stripe/webhook`

監視イベント:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

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

# シードデータクリア
npx convex run seed:clearTestData
```

---

## 注意事項

- `convex/_generated/` は自動生成なので編集しない
- PRマージ前にローカルで `pnpm typecheck && pnpm lint && pnpm format:check` を実行
- 機能実装後は必ずテストを追加
- シードデータの更新要否を確認

# Oaiko - セッション引き継ぎ書

> 最終更新: 2024-12-30
> ステータス: CI/CD構築完了

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
  - CI: lint, format, typecheck, build（並列実行）
  - Deploy: Convex → Vercel Deploy Hook
- pnpmへ移行

**次にやること**

- ドメインモデル設計
- DBスキーマ設計（`convex/schema.ts`）
- 認証方式決定・実装

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
Auth: 未決定（Clerk or Convex Auth）
Deploy: Vercel + Convex
```

### 技術選定の経緯

1. **案A（Next.js + tRPC + Drizzle + Neon）** - 型安全だが自分で実装が必要
2. **案B（Remix + Drizzle + Turso）** - Web標準でシンプル
3. **案F（Next.js + Convex）** ← **採用**

**Convexを選んだ理由**

- リアルタイム同期が組み込み（共有家計簿に最適）
- Optimistic UIがデフォルト（サクサク動作）
- IaC不要でアプリコードに集中できる
- 無料枠が個人開発に十分（DB 0.5GB、関数100万回/月）

**許容したトレードオフ**

- Convexへのベンダーロックイン
- 独自クエリ言語の学習

**Next.jsを選んだ理由**

- 将来の拡張性（LP追加、SEO、OGP生成など）
- 情報量が多く、困った時の解決策が豊富
- Vite + Reactでも良かったが、規模拡大を見越して採用

---

## MVP機能仕様

### 機能一覧

| 機能             | 詳細                                          |
| ---------------- | --------------------------------------------- |
| **支出記録**     | 金額、カテゴリ、支払者、日付、メモ            |
| **負担方法**     | 均等 / 傾斜（割合） / 傾斜（金額） / 全額負担 |
| **グループ**     | Nグループ対応（ユーザーは複数グループ所属可） |
| **メンバー**     | M人対応（グループごと）                       |
| **カテゴリ**     | プリセット（食費、日用品等） + カスタム追加   |
| **精算**         | 月ごと表示、精算済み/未精算ステータス管理     |
| **分析**         | カテゴリ別円グラフ、月別推移グラフ            |
| **買い物リスト** | グループ共有、支出連携、履歴表示              |

### 負担方法の詳細

```
例: 1000円の支出、Aさんが支払い、A・B・Cの3人グループ

均等:       A:334, B:333, C:333
傾斜(割合): A:50%, B:30%, C:20% → A:500, B:300, C:200
傾斜(金額): A:500, B:300, C:200（直接指定）
全額負担:   Aが全額 or Bが全額 etc
```

### 買い物リスト連携

```
1. 買い物リストに登録（グループ共有）
   - 牛乳、パン、洗剤...

2. 買い物完了 → 支出登録
   - チェックしたアイテム → 合計金額入力 → 支出として記録
   - 購入済みアイテムはリストから自動削除
   - 履歴モードで過去の購入済みを確認可能
```

### MVP外（将来検討）

- レシートOCR
- 通知機能
- 収入記録
- 買い物リストの個別金額入力

---

## UX指針

1. **モバイルファースト徹底**（デスクトップは後回し）
2. **入力UX最優先**（目標: 3タップ以内で記録完了）
3. **PWA対応必須**
4. **パフォーマンス重視**（初期ロード3秒以内、Optimistic UI）
5. **オフライン対応は段階的に**
6. **将来のネイティブ化**（Capacitor等）を視野に

---

## プロジェクト構造

```
/Users/ron/Dev/oaiko/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx           # サンプルページ（要削除/修正）
│   ├── globals.css
│   └── server/            # Server Components サンプル
├── convex/                 # Convex バックエンド
│   ├── schema.ts          # DBスキーマ（これから設計）
│   ├── myFunctions.ts     # サンプル関数（要削除/修正）
│   ├── _generated/        # 自動生成（触らない）
│   └── README.md
├── components/
│   └── ConvexClientProvider.tsx
├── docs/
│   ├── tech-selection.md  # 技術選定ドキュメント
│   └── mvp-features.md    # MVP機能仕様
├── public/
├── CLAUDE.md              # プロジェクト概要（Claude Code用）
├── HANDOVER.md            # この引き継ぎ書
├── package.json
└── tsconfig.json
```

---

## デプロイ情報

| 環境           | URL                                      |
| -------------- | ---------------------------------------- |
| 本番（Vercel） | https://oaiko.vercel.app                 |
| Convex本番     | https://hip-moose-165.convex.cloud       |
| Convex開発     | https://proper-guanaco-454.convex.cloud  |
| GitHub         | https://github.com/nakayamaryo0731/oaiko |

---

## 次のセッションでやること

### 1. ドメインモデル設計

検討すべきエンティティ：

- User（ユーザー）
- Group（グループ）
- GroupMember（グループメンバー関連）
- Expense（支出）
- ExpenseSplit（支出の負担配分）
- Category（カテゴリ）
- Settlement（精算）
- ShoppingList / ShoppingItem（買い物リスト）

### 2. DBスキーマ設計

`convex/schema.ts` にスキーマを定義。
Convexの特徴：

- リレーションはID参照（`v.id("users")`）
- インデックスを明示的に定義
- マイグレーション自動

### 3. 認証方式決定

- Clerk: DX良い、UIコンポーネント付き
- Convex Auth: Convex統合、シンプル

---

## 参考情報

### Convex公式ドキュメント

- https://docs.convex.dev
- スキーマ定義: https://docs.convex.dev/database/schemas
- 認証: https://docs.convex.dev/auth

### 競合アプリ（参考）

- Shareroo - 共有家計簿No.1（参考元）
- Warikani - 2人専用割り勘
- Splitwise - 海外の定番割り勘アプリ

### 費用感

| サービス | 無料枠                   |
| -------- | ------------------------ |
| Convex   | DB 0.5GB, 関数100万回/月 |
| Vercel   | 十分                     |
| Clerk    | MAU 10,000               |

---

## 決定事項ログ

| 日付       | 決定事項                       | 理由                                                 |
| ---------- | ------------------------------ | ---------------------------------------------------- |
| 2024-12-30 | 技術スタック: Next.js + Convex | リアルタイム同期、Optimistic UI、開発速度            |
| 2024-12-30 | プロダクト名: Oaiko            | 「おあいこ」= 精算して貸し借りなし。被りなし確認済み |
| 2024-12-30 | フロントエンド: Next.js        | 将来の拡張性（LP、SEO等）を考慮                      |

---

## 注意事項

- `convex/_generated/` は自動生成なので編集しない
- `app/page.tsx` と `convex/myFunctions.ts` はサンプルなので、実装開始時に削除/修正
- 認証方式（Clerk vs Convex Auth）は未決定。実装前に決める必要あり

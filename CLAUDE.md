# Oaiko（おあいこ）

共有家計簿Webアプリ。Sharerooを参考に、Web版として開発。

## プロジェクト概要

- **プロダクト名**: Oaiko（おあいこ）
- **名前の由来**: お相子 = 精算して貸し借りなし
- **コンセプト**: 割り勘・傾斜折半ができる共有家計簿
- **ターゲット**: 同棲カップル、夫婦、シェアハウス住人
- **差別化**: 割り勘・傾斜折半 + プラットフォーム非依存（Web）

## 方針

### プラットフォーム

- **Webアプリ**で可能な限り最高のUXを目指す
- ネイティブではなくWebを選んだ理由:
  - Sharerooにない「プラットフォーム非依存」という差別化
  - 個人開発として現実的なスコープ
  - URLで招待できる（アプリインストール不要）

### 設計方針

- ドメインモデルをちゃんと組む
- テストをちゃんと書く
- シンプルな機能で最高のUX

### 実装方針

- **シンプルさを追求**: 複雑な実装より、シンプルな解決策を選ぶ
- **実装後レビュー**: 一度実装した後、必ず見直してリファクタリング改善ポイントをチェックする
  - より簡潔に書けないか？
  - 不要な複雑さはないか？
  - 組み込み機能やサービス提供の機能で代替できないか？
- **コメントは最小限**: コードを見てわからない箇所にのみコメントを書く
  - NG: 番号付きステップコメント（`// 1. バリデーション`）
  - NG: コードを読めばわかる説明
  - OK: 非自明なビジネスロジックの説明
  - OK: 公開APIのJSDoc（ただし簡潔に）
  - **理由**: コメントが多い = 設計がおかしい可能性のサイン
- **テスト実装必須**: 機能実装後は必ず対応するテストも実装する
  - Convex関数（mutation/query）のユニットテスト
  - テストファイルは `convex/__tests__/` に配置
  - テスト実行: `pnpm test:run`
- **シードデータの更新**: 新機能追加時は必ずシードデータの更新要否を確認する
  - 動作確認に必要なデータがあれば `convex/seed.ts` と `convex/lib/seedData.ts` に追加
  - 設計ドキュメント: `docs/design-seed-data.md`
  - 実行: `npx convex run seed:seedTestData`
- 例: Vercel CLI複雑な認証回避 → Deploy Hook（シンプル）

### UX指針

1. モバイルファースト徹底（デスクトップは後回し）
2. 入力UX最優先（目標: 3タップ以内で記録完了）
3. PWA対応必須
4. パフォーマンス重視（初期ロード3秒以内、Optimistic UI）
5. オフライン対応は段階的に
6. 将来のネイティブ化（Capacitor等）を視野に

## MVP要件

詳細は `docs/mvp-features.md` を参照。

### 機能一覧

- 支出記録（金額、カテゴリ、支払者、日付、メモ）
- 負担方法（均等 / 傾斜（割合・金額） / 全額負担）
- グループ・メンバー（Nグループ、M人対応）
- カテゴリ（プリセット + カスタム追加）
- 精算（月ごと表示、精算済み/未精算ステータス）
- 分析（カテゴリ別円グラフ、月別推移）
- 買い物リスト（グループ共有、支出連携、履歴表示）

### MVP外

- レシートOCR
- 通知機能
- 収入記録

## 技術スタック

```
Frontend: Next.js (App Router)
Backend: Convex (DB + API + リアルタイム同期)
Auth: Clerk or Convex Auth（未決定）
Deploy: Vercel + Convex
```

### 選定理由

- リアルタイム同期が組み込み（共有家計簿に最適）
- Optimistic UIがデフォルト（サクサク動作）
- IaC不要でアプリコードに集中できる

詳細は `docs/tech-selection.md` を参照。

## ドキュメント

- `HANDOVER.md` - セッション引き継ぎ書（現在のステータス・次のステップ）
- `docs/tech-selection.md` - 技術選定の比較検討・決定事項
- `docs/mvp-features.md` - MVP機能仕様

## 開発フロー

### ローカル開発

```bash
# 開発サーバー起動（Next.js + Convex同時起動）
pnpm dev
```

### デプロイ

**重要: デプロイはPRマージで行う**

**絶対禁止: mainブランチへの直接push**

- ユーザーが明示的に許可した場合を除き、mainへの直接pushは禁止
- 必ずfeatureブランチを作成してPRを経由すること

1. featureブランチを作成して作業
2. **PR作成前に必ずローカルでチェックを実行**（下記参照）
3. PRを作成 → CI（lint, format, typecheck, build）が自動実行
4. CIパス確認後、mainにマージ
5. マージ後、Deployワークフローが自動実行（Convex → Vercel）
6. **CI/CDが正常終了したことを必ず確認する**

```bash
# ワークフロー実行状況確認
gh run list --limit 3

# 特定のワークフロー監視
gh run watch <run-id>
```

### CI/CD構成

- **CI** (PR時): lint, format, typecheck, build を並列実行
- **Deploy** (main push時): Convex → Vercel を順次実行

### PR作成前のローカルチェック（必須）

PR作成前に以下のコマンドを実行し、すべてパスすることを確認する:

```bash
pnpm format      # コードフォーマット
pnpm lint        # ESLint
pnpm typecheck   # TypeScript型チェック
pnpm test:run    # ユニットテスト
```

**注意**: CIで落ちると手戻りが発生するため、必ずローカルで確認してからPRを作成すること。

### その他コマンド

```bash
# lint
pnpm lint

# フォーマット
pnpm format

# 型チェック
pnpm typecheck

# Convex手動デプロイ（通常は不要）
pnpm dlx convex deploy --yes
```

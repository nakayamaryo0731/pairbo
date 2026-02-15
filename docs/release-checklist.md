# Pairbo リリース前チェックリスト

> 作成日: 2026-02-14
> 最終更新: 2026-02-15
> ステータス: 対応中

---

## 🔴 必須（リリースブロッカー）

### 1. 本番環境キーの切り替え

- [ ] **Clerk**: テストキー (`pk_test_`, `sk_test_`) → 本番キー (`pk_live_`, `sk_live_`) に切り替え
- [ ] **Stripe**: Stripe ダッシュボードでライブモードの商品・価格を作成し、Convex 環境変数に設定
  - [ ] `STRIPE_SECRET_KEY` → `sk_live_...`
  - [ ] `STRIPE_WEBHOOK_SECRET` → 本番 Webhook シークレット
  - [ ] `STRIPE_PRICE_MONTHLY` → 本番 Price ID
  - [ ] `STRIPE_PRICE_YEARLY` → 本番 Price ID
- [ ] **CLERK_ISSUER_URL**: Convex 環境変数に本番 Clerk 発行者 URL を設定（現在未設定の可能性）
- [ ] GitHub Secrets も本番値に更新
  - [ ] `NEXT_PUBLIC_CONVEX_URL`
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### 2. 依存パッケージの脆弱性修正

- [x] `next` を **16.1.5 以上**にアップデート → **16.1.6 に更新済み**
  - ~~HTTP request deserialization DoS (GHSA-h25m-26qc-wcjf)~~ 解消
  - ~~Image Optimizer remotePatterns DoS (GHSA-9g9p-9gw9-jx7f)~~ 解消
  - ~~PPR Resume endpoint メモリ消費 (GHSA-5f7q-jpqc-wp7h)~~ 解消
- [ ] `stripe` パッケージのアップデート確認（`qs` の low 脆弱性 GHSA-w7fw-mjwx-w883）← Stripe 側の修正待ち
- [x] アップデート後に `pnpm test:run` で全テストパスを確認 → 305 件全パス

### 3. Stripe Webhook の本番設定

- [ ] Stripe ダッシュボードでライブモードの Webhook エンドポイントを作成
  - エンドポイント: `https://{本番CONVEX_DOMAIN}/stripe/webhook`
- [ ] 監視イベントを設定
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Webhook のテスト配信で動作確認

### 4. OGP 画像の作成・設定

- [x] OGP 画像を作成（SNS シェア時に表示）→ `public/og-image.png` に配置済み
- [x] `app/layout.tsx` の metadata に `openGraph` プロパティを追加済み
- [x] Twitter Card 用のメタデータも追加済み
- [x] OGP 画像作成後、metadata の `images` プロパティに画像パスを設定 → `/og-image.png` を設定済み

---

## 🟡 強く推奨（UX・品質に直結）

### 5. カスタム 404 ページの作成

- [x] `app/not-found.tsx` を作成済み
- [x] Pairbo ブランドに合わせたデザイン
- [x] ホームへの導線を設置

### 6. SEO 対応

- [x] `public/robots.txt` の追加済み
- [x] `app/sitemap.ts` の追加済み
- [ ] Google Analytics の設定（`NEXT_PUBLIC_GA_MEASUREMENT_ID` を Vercel 環境変数に設定）

### 7. Sentry のトレースサンプリング率を下げる

- [x] `sentry.server.config.ts`: `tracesSampleRate` を `1` → `0.2` に変更済み
- [x] `sentry.edge.config.ts`: 同上
- [x] `instrumentation-client.ts`: 同上

### 8. デモページの処理

- [x] `/demo/expense-form` は既にミドルウェアで認証必須（公開ルートに含まれていない）

### 9. console 文の整理

- [x] `app/page.tsx` - `.catch(() => {})` に変更
- [x] `app/groups/[groupId]/expenses/[expenseId]/page.tsx` - `console.error` 削除
- [x] `app/pricing/page.tsx` - 2 箇所の `console.error` 削除
- [x] `components/ads/MockAdBanner.tsx` - `console.log` 削除
- [x] `components/settlements/SettlementDetail.tsx` - `console.error` 削除
- [x] `components/groups/GroupDetail.tsx` - `console.error` 削除

### 10. ロゴ・アイコンの正式版作成

- [x] 正式なブランドロゴをデザイン → `public/icons/logo.png` に配置済み
- [x] `scripts/generate-icons.mjs` を更新して全サイズのアイコンを再生成 → logo.png からリサイズ生成に変更
- [x] ファビコン（`public/favicon.ico`）も更新済み
- [x] ~~現在は仮デザイン（青背景に白い円）~~ → 正式ロゴに置換済み

---

## 🟢 推奨（あると良い）

### 11. カスタムドメインの取得・設定

- [ ] ドメイン取得（pairbo.jp 等）
- [ ] Vercel にカスタムドメインを設定
- [ ] Clerk のリダイレクト先 URL を更新
- [ ] Stripe の Webhook エンドポイント URL を更新

### 12. オフラインページの改善

- [x] リトライボタンの追加済み
- [x] Pairbo ブランドに合わせたデザインに更新済み

### 13. GitHub リポジトリの説明文追加

- [x] 「Pairbo（ペアボ）- 2 人のための共有家計簿。割り勘・傾斜折半ができる Web アプリ。」を設定済み

### 14. ドキュメント内の旧名称更新

以下のファイルで「Oaiko」が残存（ユーザーには見えないが統一しておくと良い）：

- [ ] `docs/mvp-features.md`
- [ ] `docs/design-monetization.md`
- [ ] `docs/design-security-checklist.md`
- [ ] `docs/tech-selection.md`
- [ ] `docs/marketing-strategy.md`
- [ ] `docs/design-pwa.md`
- [ ] `docs/design-free-ads.md`
- [ ] `docs/design-header-footer-ux.md`
- [ ] `docs/design-manual-settlement-mode.md`
- [ ] `docs/design-domain-model.md`
- [ ] `docs/design-testing.md`
- [ ] `docs/design-logger.md`
- [ ] `docs/design-authentication.md`
- [ ] `docs/design-group-detail.md`
- [ ] `docs/design-group-feature.md`
- [ ] `scripts/generate-icons.mjs`（コメント）
- [ ] `CLAUDE.md`（一部）

### 15. `.env.example` の更新

- [x] Stripe 関連の環境変数を追加済み
- [x] `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` を追加済み
- [x] `NEXT_PUBLIC_GA_MEASUREMENT_ID` を追加済み
- [x] `NEXT_PUBLIC_ADSENSE_CLIENT_ID` を追加済み

### 16. Sentry DSN の環境変数化

- [x] `instrumentation-client.ts` → `process.env.NEXT_PUBLIC_SENTRY_DSN`
- [x] `sentry.server.config.ts` → `process.env.SENTRY_DSN`
- [x] `sentry.edge.config.ts` → `process.env.SENTRY_DSN`
- [x] `.env.local` に DSN を設定済み

---

## ⚪ 将来対応（リリース後で OK）

| 項目                                     | 備考                              |
| ---------------------------------------- | --------------------------------- |
| Premium 限定機能の実装                   | 詳細分析、データエクスポート      |
| AdSense 再申請                           | コンテンツ充実後                  |
| CSP ヘッダーの設定                       | セキュリティ強化                  |
| セグメントレベルの Error Boundary        | 現在は global-error.tsx のみ      |
| 各ルートの loading.tsx 追加              | 現在はホーム画面のみ実装          |
| データマイグレーション戦略               | スケール時に必要                  |
| シークレットのローテーション方針         | 運用ルール策定                    |
| 退会機能・データ削除                     | GDPR 対応含む                     |
| ランディングページの Server Component 化 | 現在 `"use client"` で SEO に不利 |

---

## 現在の良い状態（確認済み）

| 項目                                             | 状態  |
| ------------------------------------------------ | ----- |
| テスト 305 件全パス                              | ✅ OK |
| ユーザー向けテキストの「Pairbo」統一             | ✅ OK |
| 認証・認可の実装（Clerk + Convex）               | ✅ OK |
| 入力バリデーション                               | ✅ OK |
| OWASP Top 10 対応                                | ✅ OK |
| シードデータの本番隔離（seed\_ プレフィクス）    | ✅ OK |
| DB スキーマ・インデックス設計（16 インデックス） | ✅ OK |
| PWA マニフェスト                                 | ✅ OK |
| Service Worker 設定（Serwist）                   | ✅ OK |
| CI/CD パイプライン                               | ✅ OK |
| 法的ページ（プライバシー、利用規約、特商法）     | ✅ OK |
| 招待 URL の動的生成（ドメインハードコードなし）  | ✅ OK |
| フォント最適化（next/font）                      | ✅ OK |
| 画像最適化（next/image）                         | ✅ OK |
| Stripe キーのハードコードなし                    | ✅ OK |
| .gitignore で .env\* 除外                        | ✅ OK |
| GitHub リポジトリ名 pairbo に変更済み            | ✅ OK |

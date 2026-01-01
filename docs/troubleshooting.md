# トラブルシューティングガイド

本番環境で不具合が発生した際の調査手順とTips。

## 基本の調査フロー

1. **エラーメッセージを確認** - ブラウザのコンソールでエラー内容を確認
2. **ローカルで再現確認** - ローカル環境で同じ操作をして再現するか確認
3. **ログを確認** - Convexダッシュボード、Vercelログを確認
4. **デプロイ状況を確認** - 最新コードがデプロイされているか確認

## よくある問題と対処法

### 本番のみでエラー、ローカルは正常

**原因の可能性:**

- デプロイが正しく行われていない
- 環境変数の設定ミス
- 本番と開発で異なるデータ

**確認手順:**

1. **Convexのデプロイ先を確認**

   ```bash
   # GitHub Actionsのデプロイログを確認
   gh run list --workflow=deploy.yml --limit 1
   gh run view <run-id> --log | grep "Deployed Convex functions"
   ```

2. **正しいdeploymentにデプロイされているか確認**
   - ローカル開発: `proper-guanaco-454`（dev）
   - 本番: `hip-moose-165`（prod）

3. **手動でConvexをデプロイして確認**
   ```bash
   npx convex deploy --yes
   # 出力されるURLが本番用か確認
   ```

### Convexで「Server Error」が表示される

**原因の可能性:**

- 通常の `Error` をスローしている（`ConvexError` ではない）
- 本番Convexに古いコードがデプロイされている

**確認手順:**

1. **Convexダッシュボードでログを確認**
   - [Convex Dashboard](https://dashboard.convex.dev) → プロジェクト → Logs
   - エラー発生直後にリフレッシュして確認

2. **関数のコードを確認**
   - Functions タブ → 該当関数 → コードを表示
   - ローカルのコードと一致しているか確認

3. **エラーの種類を確認**
   - `Error`: クライアントには「Server Error」としか表示されない
   - `ConvexError`: エラーメッセージがクライアントに表示される

## 環境・デプロイ関連

### GitHub Secretsの確認

```bash
# シークレット一覧を確認
gh secret list

# シークレットを更新
gh secret set CONVEX_DEPLOY_KEY --body "prod:xxx|yyy"
```

### 重要な環境変数

| 変数名                   | 用途                     |
| ------------------------ | ------------------------ |
| `CONVEX_DEPLOY_KEY`      | Convex本番デプロイ用キー |
| `NEXT_PUBLIC_CONVEX_URL` | ConvexのURL              |
| `VERCEL_DEPLOY_HOOK`     | Vercelデプロイ用Hook     |

### Convex Deploymentの確認

```bash
# ローカルの設定確認
cat .env.local | grep CONVEX

# 本番のデプロイキー取得
# Convexダッシュボード → Settings → Deploy Key
```

## デバッグコマンド集

```bash
# GitHub Actionsの最新デプロイ確認
gh run list --workflow=deploy.yml --limit 3

# デプロイログの詳細確認
gh run view <run-id> --log

# Convex手動デプロイ
npx convex deploy --yes

# Convexダッシュボードを開く
npx convex dashboard
```

## 過去の事例

### 2026-01-01: 分析ページでServer Error

**症状:**

- 本番の分析ページで `Server Error` が表示
- ローカルでは正常に動作
- Convexログでは `success` と表示

**原因:**

- `CONVEX_DEPLOY_KEY` が開発用deployment（`proper-guanaco-454`）を指していた
- 本番用deployment（`hip-moose-165`）にコードがデプロイされていなかった

**解決:**

- GitHub Secretsの `CONVEX_DEPLOY_KEY` を本番用に更新
- ワークフローを再実行してデプロイ

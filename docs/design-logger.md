# ロガー機能 設計書

## Overview

Oaiko（おあいこ）における構造化ロギング機能の設計。Convex関数で統一されたログ出力を行い、デバッグ、監査、運用監視を効率化する。

## Purpose

### なぜ必要か

1. **デバッグの効率化**
   - 開発中の問題特定を迅速化
   - 本番環境での障害調査をサポート

2. **監査ログの基盤**
   - セキュリティチェックリストで「監査ログ未実装」と指摘
   - 重要操作（グループ作成、精算等）の記録が必要

3. **運用監視の準備**
   - 将来のログストリーム連携（Axiom/Datadog）への布石
   - 構造化ログにより分析・アラート設定が容易に

4. **一貫性のあるログ出力**
   - 開発者ごとのログ形式のばらつきを防止
   - 検索・フィルタリングしやすい形式

### 代替案との比較

| 方法 | メリット | デメリット |
|------|----------|------------|
| 素の `console.log` | 実装不要 | 形式不統一、検索困難 |
| 構造化ロガー（採用） | 検索容易、拡張性高 | 初期実装コスト |
| 外部ログサービス直接連携 | 高機能 | 設定複雑、コスト（Pro Plan必要） |

## What to Do

### 機能要件

#### 1. ログレベル

| レベル | 用途 | 出力先 |
|--------|------|--------|
| `debug` | 開発時の詳細情報 | 開発環境のみ |
| `info` | 通常の処理情報 | 全環境 |
| `warn` | 警告（処理は継続） | 全環境 |
| `error` | エラー（処理失敗） | 全環境 |
| `audit` | 監査ログ（重要操作） | 全環境 |

#### 2. ログトピック

```mermaid
mindmap
  root((ログトピック))
    AUTH
      ユーザー作成
      ログイン試行
    GROUP
      グループ作成
      メンバー追加
      招待作成
    EXPENSE
      支出作成
      支出編集
      支出削除
    SETTLEMENT
      精算作成
      支払い完了
    SYSTEM
      関数実行
      エラー
```

#### 3. ログ出力形式

```json
{
  "timestamp": "2024-12-30T12:00:00.000Z",
  "level": "info",
  "topic": "GROUP",
  "action": "create",
  "userId": "user_abc123",
  "metadata": {
    "groupId": "group_xyz789",
    "groupName": "テスト家計簿"
  },
  "message": "グループを作成しました",
  "requestId": "req_123456"
}
```

#### 4. 提供するAPI

```typescript
// 使用例
ctx.logger.info("GROUP", "create", { groupId, groupName }, "グループを作成しました");
ctx.logger.error("EXPENSE", "create", { error: e.message }, "支出作成に失敗");
ctx.logger.audit("SETTLEMENT", "complete", { settlementId, amount }, "精算が完了");
```

### 非機能要件

| 項目 | 要件 |
|------|------|
| パフォーマンス | ログ出力が処理時間に影響しない（同期的に実行） |
| 可用性 | ログ出力の失敗が本体処理に影響しない |
| 拡張性 | 将来のログストリーム連携に対応可能な形式 |
| 型安全性 | トピック、レベルは型で制約 |

## How to Do It

### アーキテクチャ

```mermaid
flowchart TB
    subgraph "Convex Functions"
        Auth[authQuery/authMutation]
        Logger[Logger]
        Handler[Function Handler]
    end

    subgraph "出力先"
        Console[console.log]
        Dashboard[Convex Dashboard]
        CLI[npx convex logs]
        Future[将来: Log Stream]
    end

    Auth --> Logger
    Logger --> Handler
    Handler --> Console
    Console --> Dashboard
    Console --> CLI
    Console -.-> Future
```

### ディレクトリ構成

```
convex/
├── lib/
│   ├── logger.ts        # ロガー本体
│   └── auth.ts          # 既存（ロガー統合）
└── ...
```

### 実装詳細

#### 1. ログトピック・レベル定義

```typescript
// convex/lib/logger.ts

export const LOG_TOPICS = {
  AUTH: "AUTH",
  GROUP: "GROUP",
  EXPENSE: "EXPENSE",
  SETTLEMENT: "SETTLEMENT",
  SHOPPING: "SHOPPING",
  SYSTEM: "SYSTEM",
} as const;

export type LogTopic = (typeof LOG_TOPICS)[keyof typeof LOG_TOPICS];

export const LOG_LEVELS = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  audit: "audit",
} as const;

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
```

#### 2. ロガークラス

```typescript
// convex/lib/logger.ts

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  topic: LogTopic;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  message?: string;
  requestId?: string;
}

export class Logger {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  private log(
    level: LogLevel,
    topic: LogTopic,
    action: string,
    metadata?: Record<string, unknown>,
    message?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      topic,
      action,
      userId: this.userId,
      metadata,
      message,
    };

    // JSON形式で出力（将来のログストリーム対応）
    const output = JSON.stringify(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
      case "audit":
        console.info(output); // auditはinfo扱いだが、topicで区別
        break;
    }
  }

  debug(topic: LogTopic, action: string, metadata?: Record<string, unknown>, message?: string) {
    this.log("debug", topic, action, metadata, message);
  }

  info(topic: LogTopic, action: string, metadata?: Record<string, unknown>, message?: string) {
    this.log("info", topic, action, metadata, message);
  }

  warn(topic: LogTopic, action: string, metadata?: Record<string, unknown>, message?: string) {
    this.log("warn", topic, action, metadata, message);
  }

  error(topic: LogTopic, action: string, metadata?: Record<string, unknown>, message?: string) {
    this.log("error", topic, action, metadata, message);
  }

  audit(topic: LogTopic, action: string, metadata?: Record<string, unknown>, message?: string) {
    this.log("audit", topic, action, metadata, message);
  }
}
```

#### 3. 認証ミドルウェアへの統合

```typescript
// convex/lib/auth.ts（変更箇所）

import { Logger } from "./logger";

export type AuthQueryCtx = QueryCtx & {
  user: AuthUser;
  logger: Logger;  // 追加
};

export type AuthMutationCtx = MutationCtx & {
  user: AuthUser;
  logger: Logger;  // 追加
};

// authQueryMiddleware 内
return {
  ctx: {
    ...ctx,
    user,
    logger: new Logger(user._id),  // 追加
  },
  args,
};
```

#### 4. 使用例

```typescript
// convex/groups.ts

export const create = authMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ctx.logger.info("GROUP", "create_start", { name: args.name });

    // バリデーション
    const name = args.name.trim();
    if (name.length === 0) {
      ctx.logger.warn("GROUP", "create_validation_failed", { reason: "empty_name" });
      throw new Error("グループ名を入力してください");
    }

    // ... 処理 ...

    const groupId = await ctx.db.insert("groups", { ... });

    // 監査ログ
    ctx.logger.audit("GROUP", "created", {
      groupId,
      groupName: name,
      ownerId: ctx.user._id,
    });

    return groupId;
  },
});
```

### シーケンス図

```mermaid
sequenceDiagram
    participant Client
    participant Convex as Convex Function
    participant Logger
    participant Console as console.log
    participant Dashboard as Convex Dashboard

    Client->>Convex: mutation呼び出し
    Convex->>Logger: logger.info("GROUP", "create_start", ...)
    Logger->>Console: JSON.stringify(entry)
    Console->>Dashboard: ログ表示
    Convex->>Convex: 処理実行
    Convex->>Logger: logger.audit("GROUP", "created", ...)
    Logger->>Console: JSON.stringify(entry)
    Console->>Dashboard: ログ表示
    Convex-->>Client: レスポンス
```

### ログ検索・フィルタリング

#### Convex Dashboard

```
# トピックでフィルタ
"topic":"GROUP"

# レベルでフィルタ
"level":"error"

# ユーザーIDでフィルタ
"userId":"user_abc123"

# 監査ログのみ
"level":"audit"
```

#### CLI

```bash
# 全ログ確認
npx convex logs

# grepでフィルタ
npx convex logs | grep '"topic":"GROUP"'

# エラーのみ
npx convex logs | grep '"level":"error"'
```

## What We Won't Do

### MVP外の機能

| 項目 | 理由 |
|------|------|
| ログストリーム連携（Axiom/Datadog） | Pro Plan必要、MVP後に検討 |
| ログのDB保存 | 容量・コスト懸念、必要になったら検討 |
| リアルタイムアラート | ログストリーム連携後に検討 |
| ログローテーション | Convex側で管理 |
| フロントエンドロギング | バックエンドのみ対象 |
| パフォーマンス計測ログ | `console.time` は別途必要時に使用 |

### 対象外の操作

| 操作 | 理由 |
|------|------|
| 読み取り操作（query）の詳細ログ | 量が多すぎる、必要時のみdebugで |
| 認証情報の詳細 | セキュリティリスク |
| パスワード等の機密情報 | ログに出力禁止 |

## Concerns

### 懸念事項と対策

| 懸念 | リスク | 対策 |
|------|--------|------|
| ログ出力によるパフォーマンス低下 | 処理遅延 | 同期的console.logは軽量、影響は軽微 |
| ログ容量の増大 | Convexの制限に達する | 重要な操作のみ記録、debugは開発時のみ |
| 機密情報の漏洩 | セキュリティリスク | metadataに入れる情報を精査 |
| ログ形式の変更 | 既存ログとの互換性 | バージョニングを検討 |

### 未解決の疑問

| 疑問 | 検討状況 |
|------|----------|
| debugログを本番で無効化するか | 環境変数で制御？一旦全環境で出力 |
| ログにRequest IDを含めるか | Convexが自動付与、手動で取得は困難 |
| 監査ログの保持期間 | Convexの制限に依存、重要なら別途保存 |

### 将来の拡張

```mermaid
flowchart LR
    subgraph "現在"
        Logger[Logger]
        Console[console.log]
    end

    subgraph "将来（Pro Plan）"
        LogStream[Log Stream]
        Axiom[Axiom]
        Datadog[Datadog]
    end

    Logger --> Console
    Console -.-> LogStream
    LogStream -.-> Axiom
    LogStream -.-> Datadog
```

## Reference Materials/Information

### Convex公式

- [Debugging | Convex Developer Hub](https://docs.convex.dev/functions/debugging) - デバッグ方法
- [Logs | Convex Developer Hub](https://docs.convex.dev/dashboard/deployments/logs) - ログ表示
- [Log Streams | Convex Developer Hub](https://docs.convex.dev/production/integrations/log-streams/) - ログストリーム
- [Customizing serverless functions](https://stack.convex.dev/custom-functions) - カスタム関数

### 構造化ロギング

- [Log Streams: Common uses](https://stack.convex.dev/log-streams-common-uses) - ログストリームの活用例
- [Observing your app in production](https://stack.convex.dev/observability-in-production) - 本番環境の監視

### 注意事項

- Convexバックエンドは限られた数のログのみ保持し、メンテナンス時に消去される可能性がある
- 本番環境ではクライアントにログが送信されない（セキュリティ上の理由）
- 長期保存が必要な場合はLog Stream連携を検討

---

## 付録A: ログレベル定義

### 各レベルの詳細定義

| レベル | 定義 | 想定読者 | 出力タイミング |
|--------|------|----------|----------------|
| `debug` | 開発者向け詳細情報。問題解決に必要な内部状態 | 開発者 | 開発時のみ推奨 |
| `info` | 正常系の処理完了。ビジネス上の重要イベント | 運用者/開発者 | 常時 |
| `warn` | 処理は継続するが注意が必要な状況 | 運用者 | 常時 |
| `error` | 処理失敗。ユーザー影響あり | 運用者（要対応） | 常時 |
| `audit` | セキュリティ・コンプライアンス上重要な操作 | 監査担当者 | 常時（必須） |

### レベル選択フローチャート

```mermaid
flowchart TD
    Start[ログ出力判断] --> Q1{処理が成功したか?}
    Q1 -->|No| Q2{リカバリー可能か?}
    Q2 -->|No| Error[error]
    Q2 -->|Yes| Warn[warn]
    Q1 -->|Yes| Q3{セキュリティ上重要か?}
    Q3 -->|Yes| Audit[audit]
    Q3 -->|No| Q4{ビジネス上重要か?}
    Q4 -->|Yes| Info[info]
    Q4 -->|No| Debug[debug]
```

## 付録B: ログ粒度ガイドライン

### 操作別ログ出力基準

#### 1. 認証・認可（AUTH）

| 操作 | レベル | ログ | metadata |
|------|--------|------|----------|
| 初回ユーザー作成 | `audit` | 必須 | userId |
| ログイン試行成功 | `info` | 任意 | - |
| 認証失敗 | `warn` | 必須 | reason |
| 権限チェック失敗 | `warn` | 必須 | action, resource |

#### 2. グループ操作（GROUP）

| 操作 | レベル | ログ | metadata |
|------|--------|------|----------|
| グループ作成 | `audit` | 必須 | groupId, groupName |
| グループ更新 | `audit` | 必須 | groupId, changes |
| グループ削除 | `audit` | 必須 | groupId |
| メンバー追加 | `audit` | 必須 | groupId, addedUserId |
| メンバー削除 | `audit` | 必須 | groupId, removedUserId |
| 招待作成 | `audit` | 必須 | groupId, expiresAt |
| 招待使用 | `audit` | 必須 | groupId, token |
| バリデーション失敗 | `warn` | 必須 | reason |

#### 3. 支出操作（EXPENSE）

| 操作 | レベル | ログ | metadata |
|------|--------|------|----------|
| 支出作成 | `info` | 必須 | expenseId, amount, categoryId |
| 支出更新 | `info` | 必須 | expenseId, changes |
| 支出削除 | `audit` | 必須 | expenseId |
| バリデーション失敗 | `warn` | 必須 | reason |

#### 4. 精算操作（SETTLEMENT）

| 操作 | レベル | ログ | metadata |
|------|--------|------|----------|
| 精算作成 | `audit` | 必須 | settlementId, amount, fromUser, toUser |
| 精算完了 | `audit` | 必須 | settlementId |
| 精算取消 | `audit` | 必須 | settlementId, reason |

#### 5. 買い物リスト（SHOPPING）

| 操作 | レベル | ログ | metadata |
|------|--------|------|----------|
| アイテム追加 | `debug` | 任意 | - |
| アイテム完了 | `debug` | 任意 | - |
| アイテム削除 | `debug` | 任意 | - |

### ログ出力しないもの

以下はログ出力対象外とする:

| 操作 | 理由 |
|------|------|
| Query（読み取り）の実行 | 量が多すぎる、パフォーマンス影響 |
| 認証トークンやセッション情報 | セキュリティリスク |
| 個人情報（メールアドレス等） | プライバシー保護 |
| パスワード、APIキー | 絶対禁止 |
| リクエスト/レスポンス全体 | 量が多すぎる |

### metadata に含めるべき情報

```mermaid
mindmap
  root((metadata))
    必須
      対象リソースID
      操作結果
    推奨
      変更内容（差分）
      関連リソースID
    禁止
      個人情報
      認証情報
      大量データ
```

### 具体的なログ出力例

```typescript
// ✅ Good: 必要十分な情報
ctx.logger.audit("GROUP", "created", {
  groupId,
  groupName: name,
});

// ✅ Good: エラー理由を含む
ctx.logger.warn("GROUP", "create_validation_failed", {
  reason: "name_too_long",
  actualLength: name.length,
  maxLength: 50,
});

// ❌ Bad: 情報が少なすぎる
ctx.logger.info("GROUP", "action");

// ❌ Bad: 情報が多すぎる・機密情報を含む
ctx.logger.info("GROUP", "created", {
  group: entireGroupObject,
  user: entireUserObject,
  token: authToken,
});
```

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|----------|--------|
| 2024-12-30 | 初版作成 | Claude |
| 2024-12-30 | 付録A・B追加（ログレベル定義、粒度ガイドライン） | Claude |

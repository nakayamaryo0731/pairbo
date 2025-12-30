# Clear Seed Data

シードデータを削除します。

以下のコマンドを実行してください：

```bash
npx convex run seed:clearTestData
```

削除されるデータ：
- `seed_` で始まる clerkId を持つユーザー
- `[TEST]` で始まる名前のグループと関連データ（カテゴリ、支出、買い物リスト）

**注意**: 本物のユーザーデータは削除されません。

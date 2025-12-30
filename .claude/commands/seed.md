# Seed Data

開発用のシードデータを投入します。

以下のコマンドを実行してください：

```bash
npx convex run seed:seedTestData
```

実行後、以下のデータが作成されます：
- ダミーユーザー2名（パートナーA、パートナーB）
- テストグループ1つ（`[TEST] テスト家計簿`）
- サンプル支出10件
- 買い物リスト5件

**注意**: 既存のシードデータがある場合は削除して再作成されます。

---

自分をテストグループに追加する場合：

1. Convex Dashboard で users テーブルから自分の `_id` を確認
2. 以下を実行：
```bash
npx convex run seed:joinTestGroup '{"userId": "YOUR_USER_ID"}'
```

/**
 * プリセットカテゴリ
 * グループ作成時にこれらのカテゴリがコピーされる
 */
export const PRESET_CATEGORIES = [
  { name: "食費", icon: "🍽️", sortOrder: 1 },
  { name: "日用品", icon: "🧴", sortOrder: 2 },
  { name: "光熱費", icon: "💡", sortOrder: 3 },
  { name: "交通費", icon: "🚃", sortOrder: 4 },
  { name: "娯楽", icon: "🎮", sortOrder: 5 },
  { name: "医療費", icon: "💊", sortOrder: 6 },
  { name: "その他", icon: "📦", sortOrder: 7 },
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

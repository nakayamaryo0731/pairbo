/**
 * プリセットカテゴリ
 * グループ作成時にこれらのカテゴリがコピーされる
 */
export const PRESET_CATEGORIES = [
  { name: "食費", icon: "🛒", sortOrder: 1 },
  { name: "外食", icon: "🍽️", sortOrder: 2 },
  { name: "日用品", icon: "🧴", sortOrder: 3 },
  { name: "住居費", icon: "🏠", sortOrder: 4 },
  { name: "光熱費", icon: "💡", sortOrder: 5 },
  { name: "通信費", icon: "📱", sortOrder: 6 },
  { name: "交通費", icon: "🚃", sortOrder: 7 },
  { name: "娯楽", icon: "🎬", sortOrder: 8 },
  { name: "趣味", icon: "🎨", sortOrder: 9 },
  { name: "衣服・美容", icon: "👕", sortOrder: 10 },
  { name: "交際費", icon: "🎁", sortOrder: 11 },
  { name: "医療費", icon: "💊", sortOrder: 12 },
  { name: "その他", icon: "📦", sortOrder: 13 },
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

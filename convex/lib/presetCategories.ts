/**
 * プリセットカテゴリ
 * グループ作成時にこれらのカテゴリがコピーされる
 */
export const PRESET_CATEGORIES = [
  { name: "食費", icon: "shopping-cart", sortOrder: 1 },
  { name: "外食", icon: "utensils-crossed", sortOrder: 2 },
  { name: "日用品", icon: "spray-can", sortOrder: 3 },
  { name: "住居費", icon: "home", sortOrder: 4 },
  { name: "光熱費", icon: "lightbulb", sortOrder: 5 },
  { name: "通信費", icon: "wifi", sortOrder: 6 },
  { name: "交通費", icon: "train-front", sortOrder: 7 },
  { name: "娯楽", icon: "film", sortOrder: 8 },
  { name: "趣味", icon: "palette", sortOrder: 9 },
  { name: "衣服・美容", icon: "shirt", sortOrder: 10 },
  { name: "交際費", icon: "gift", sortOrder: 11 },
  { name: "医療費", icon: "stethoscope", sortOrder: 12 },
  { name: "その他", icon: "package", sortOrder: 13 },
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

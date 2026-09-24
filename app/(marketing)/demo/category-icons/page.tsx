"use client";

import {
  ShoppingCart,
  UtensilsCrossed,
  SprayCan,
  Home,
  Zap,
  Lightbulb,
  Plug,
  Flame,
  Smartphone,
  Wifi,
  Globe,
  Signal,
  TrainFront,
  Film,
  Palette,
  Shirt,
  Gift,
  Stethoscope,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CategoryOption = {
  name: string;
  emoji: string;
  icons: { icon: LucideIcon; label: string }[];
};

const categories: CategoryOption[] = [
  {
    name: "食費",
    emoji: "🛒",
    icons: [{ icon: ShoppingCart, label: "ShoppingCart" }],
  },
  {
    name: "外食",
    emoji: "🍽️",
    icons: [{ icon: UtensilsCrossed, label: "UtensilsCrossed" }],
  },
  {
    name: "日用品",
    emoji: "🧴",
    icons: [{ icon: SprayCan, label: "SprayCan" }],
  },
  { name: "住居費", emoji: "🏠", icons: [{ icon: Home, label: "Home" }] },
  {
    name: "光熱費",
    emoji: "💡",
    icons: [
      { icon: Lightbulb, label: "Lightbulb" },
      { icon: Flame, label: "Flame" },
      { icon: Plug, label: "Plug" },
      { icon: Zap, label: "Zap" },
    ],
  },
  {
    name: "通信費",
    emoji: "📱",
    icons: [
      { icon: Wifi, label: "Wifi" },
      { icon: Globe, label: "Globe" },
      { icon: Signal, label: "Signal" },
      { icon: Smartphone, label: "Smartphone" },
    ],
  },
  {
    name: "交通費",
    emoji: "🚃",
    icons: [{ icon: TrainFront, label: "TrainFront" }],
  },
  { name: "娯楽", emoji: "🎬", icons: [{ icon: Film, label: "Film" }] },
  { name: "趣味", emoji: "🎨", icons: [{ icon: Palette, label: "Palette" }] },
  { name: "衣服・美容", emoji: "👕", icons: [{ icon: Shirt, label: "Shirt" }] },
  { name: "交際費", emoji: "🎁", icons: [{ icon: Gift, label: "Gift" }] },
  {
    name: "医療費",
    emoji: "💊",
    icons: [{ icon: Stethoscope, label: "Stethoscope" }],
  },
  { name: "その他", emoji: "📦", icons: [{ icon: Package, label: "Package" }] },
];

export default function CategoryIconsDemo() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="text-xl font-bold text-slate-800 mb-6">
        カテゴリアイコン比較
      </h1>

      <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
        {categories.map(({ name, emoji, icons }) => (
          <div
            key={name}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3"
          >
            {/* 現在（絵文字） */}
            <div className="text-center w-12 shrink-0">
              <span className="text-2xl">{emoji}</span>
              <p className="text-[10px] text-slate-400 mt-1">現在</p>
            </div>

            <span className="text-slate-300">→</span>

            {/* Lucide アイコン候補 */}
            <div className="flex gap-2 flex-wrap">
              {icons.map(({ icon: Icon, label }) => (
                <div key={label} className="text-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* カテゴリ名 */}
            <span className="text-sm font-medium text-slate-700 ml-auto shrink-0">
              {name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

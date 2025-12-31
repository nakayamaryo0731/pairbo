"use client";

import { useState } from "react";

type StylePattern = "minimal" | "card" | "modern";
type ColorTheme = "slate" | "violet" | "emerald" | "blue" | "skyblue" | "indigo" | "amber" | "rose";

const COLOR_THEMES: Record<
  ColorTheme,
  {
    name: string;
    chip: string;
    chipSelected: string;
    chipUnselected: string;
    button: string;
    border: string;
    segmentBg: string;
    preview: string;
  }
> = {
  slate: {
    name: "Slate",
    chip: "bg-slate-800 text-white",
    chipSelected: "bg-slate-800 text-white",
    chipUnselected: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    button: "bg-slate-800 hover:bg-slate-700 text-white",
    border: "border-slate-800 text-slate-800",
    segmentBg: "bg-slate-100",
    preview: "bg-slate-800",
  },
  violet: {
    name: "Violet",
    chip: "bg-violet-600 text-white",
    chipSelected: "bg-violet-600 text-white",
    chipUnselected: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    button: "bg-violet-600 hover:bg-violet-500 text-white",
    border: "border-violet-600 text-violet-600",
    segmentBg: "bg-violet-50",
    preview: "bg-violet-600",
  },
  emerald: {
    name: "Emerald",
    chip: "bg-emerald-600 text-white",
    chipSelected: "bg-emerald-600 text-white",
    chipUnselected: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    button: "bg-emerald-600 hover:bg-emerald-500 text-white",
    border: "border-emerald-600 text-emerald-600",
    segmentBg: "bg-emerald-50",
    preview: "bg-emerald-600",
  },
  blue: {
    name: "Blue",
    chip: "bg-blue-500 text-white",
    chipSelected: "bg-blue-500 text-white",
    chipUnselected: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    button: "bg-blue-500 hover:bg-blue-400 text-white",
    border: "border-blue-400 text-blue-500",
    segmentBg: "bg-blue-50",
    preview: "bg-blue-500",
  },
  // 淡いブルーバリエーション
  skyblue: {
    name: "Sky Blue",
    chip: "bg-sky-400 text-white",
    chipSelected: "bg-sky-400 text-white",
    chipUnselected: "bg-sky-50 text-sky-600 hover:bg-sky-100",
    button: "bg-sky-400 hover:bg-sky-300 text-white",
    border: "border-sky-300 text-sky-500",
    segmentBg: "bg-sky-50",
    preview: "bg-sky-400",
  },
  indigo: {
    name: "Indigo",
    chip: "bg-indigo-400 text-white",
    chipSelected: "bg-indigo-400 text-white",
    chipUnselected: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    button: "bg-indigo-400 hover:bg-indigo-300 text-white",
    border: "border-indigo-300 text-indigo-500",
    segmentBg: "bg-indigo-50",
    preview: "bg-indigo-400",
  },
  amber: {
    name: "Amber",
    chip: "bg-amber-500 text-white",
    chipSelected: "bg-amber-500 text-white",
    chipUnselected: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    button: "bg-amber-500 hover:bg-amber-400 text-white",
    border: "border-amber-500 text-amber-600",
    segmentBg: "bg-amber-50",
    preview: "bg-amber-500",
  },
  rose: {
    name: "Rose",
    chip: "bg-rose-500 text-white",
    chipSelected: "bg-rose-500 text-white",
    chipUnselected: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    button: "bg-rose-500 hover:bg-rose-400 text-white",
    border: "border-rose-500 text-rose-600",
    segmentBg: "bg-rose-50",
    preview: "bg-rose-500",
  },
};

const MOCK_CATEGORIES = [
  { id: "1", name: "食費", icon: "🍽️" },
  { id: "2", name: "交通費", icon: "🚃" },
  { id: "3", name: "日用品", icon: "🧴" },
  { id: "4", name: "娯楽", icon: "🎮" },
  { id: "5", name: "光熱費", icon: "💡" },
  { id: "6", name: "通信費", icon: "📱" },
  { id: "7", name: "医療費", icon: "🏥" },
  { id: "8", name: "その他", icon: "📦" },
];

const MOCK_MEMBERS = [
  { id: "1", name: "パートナーA", isMe: false },
  { id: "2", name: "パートナーB", isMe: false },
  { id: "3", name: "遼 中山", isMe: true },
  { id: "4", name: "ゲストC", isMe: false },
  { id: "5", name: "ゲストD", isMe: false },
];

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * パターンA: ミニマル（余白多め、ボーダーレス）
 * - タイトル: 常に表示
 * - メモ: 削除
 * - 日付: コンパクト
 * - カテゴリ/支払者: 横スクロール対応
 */
function MinimalForm({ theme }: { theme: ColorTheme }) {
  const [amount, setAmount] = useState("");
  const colors = COLOR_THEMES[theme];

  return (
    <div className="space-y-6 py-2">
      {/* 金額 - 大きく目立たせる */}
      <div className="text-center py-4">
        <div className="inline-flex items-baseline gap-1">
          <span className="text-3xl text-slate-400">¥</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-5xl font-light text-slate-800 w-48 text-center bg-transparent border-none outline-none placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* タイトル + 日付 - 横並び */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="タイトル"
          className="flex-1 py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
        />
        <input
          type="date"
          defaultValue={getTodayString()}
          className="py-3 px-3 bg-slate-50 rounded-xl border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-slate-200 w-36"
        />
      </div>

      {/* カテゴリ - 横スクロールチップ */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          カテゴリ
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {MOCK_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all shrink-0 ${
                i === 0 ? colors.chipSelected : colors.chipUnselected
              }`}
            >
              <span>{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 支払者 - 横スクロール */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          支払った人
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
          {MOCK_MEMBERS.map((member) => (
            <button
              key={member.id}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                member.isMe ? colors.chipSelected : colors.chipUnselected
              }`}
            >
              {member.name}
              {member.isMe && " ✓"}
            </button>
          ))}
        </div>
      </div>

      {/* 負担方法 - 常に表示 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            負担方法
          </span>
          <div className="flex gap-2 text-xs text-slate-500">
            <button className="hover:text-slate-800">全選択</button>
            <span>|</span>
            <button className="hover:text-slate-800">全解除</button>
          </div>
        </div>
        {/* メンバー選択 */}
        <div className="flex flex-wrap gap-2">
          {MOCK_MEMBERS.map((member) => (
            <button
              key={member.id}
              className={`px-3 py-1.5 rounded-full text-sm border-2 bg-white ${colors.border}`}
            >
              {member.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">5人で分割</p>
        {/* 分割方法 */}
        <div className={`${colors.segmentBg} p-1 rounded-xl flex`}>
          {["均等", "割合", "金額", "全額"].map((method, i) => (
            <button
              key={method}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                i === 0
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* 買い物リストから選択 */}
      <button className="w-full flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
            />
          </svg>
          <span className="text-sm">買い物リストから選択</span>
        </div>
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 送信ボタン */}
      <button
        className={`w-full py-4 font-medium rounded-2xl transition-colors ${colors.button}`}
      >
        記録する
      </button>
    </div>
  );
}

/**
 * パターンB: カードグルーピング
 */
function CardForm() {
  const [amount, setAmount] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="space-y-4">
      {/* メインカード: 金額 + カテゴリ */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="text-sm opacity-80 mb-2">支出金額</div>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-2xl opacity-80">¥</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-4xl font-bold bg-transparent border-none outline-none w-40 placeholder:text-white/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {MOCK_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap transition-all ${
                i === 0
                  ? "bg-white text-blue-600"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <span>{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 詳細カード */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="space-y-5">
          {/* 支払者 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              支払った人
            </label>
            <select className="w-full py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200">
              {MOCK_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {member.isMe && " (自分)"}
                </option>
              ))}
            </select>
          </div>

          {/* 日付 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              日付
            </label>
            <input
              type="date"
              defaultValue={getTodayString()}
              className="w-full py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* 負担方法 */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              負担方法
            </label>
            <div className="bg-slate-100 p-1 rounded-xl flex">
              {["均等", "割合", "金額", "全額"].map((method, i) => (
                <button
                  key={method}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    i === 0
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-2">3人で均等に分割</p>
          </div>
        </div>
      </div>

      {/* オプションカード */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="w-full p-4 flex items-center justify-between text-slate-600 hover:bg-slate-50"
        >
          <span className="text-sm font-medium">詳細オプション</span>
          <svg
            className={`w-5 h-5 transition-transform ${showOptions ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showOptions && (
          <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
            <input
              type="text"
              placeholder="タイトル（任意）"
              className="w-full py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
            />
            <input
              type="text"
              placeholder="メモ（任意）"
              className="w-full py-3 px-4 bg-slate-50 rounded-xl border-none text-slate-800 outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>

      {/* 送信ボタン */}
      <button className="w-full py-4 bg-blue-500 text-white font-medium rounded-2xl hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25">
        記録する
      </button>
    </div>
  );
}

/**
 * パターンC: モダン・ボールド
 */
function ModernForm() {
  const [amount, setAmount] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="space-y-6">
      {/* 金額入力 - 特大 */}
      <div className="py-8 border-b-2 border-slate-200">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-black text-slate-300">¥</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-6xl font-black text-slate-800 w-52 text-center bg-transparent border-none outline-none placeholder:text-slate-200"
          />
        </div>
      </div>

      {/* カテゴリ - グリッド */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Category
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {MOCK_CATEGORIES.map((cat, i) => (
            <button
              key={cat.id}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                i === 0
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-bold">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 支払者 & 日付 - 横並び */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Paid by
          </h3>
          <select className="w-full py-3 px-3 bg-slate-100 rounded-xl border-2 border-transparent text-slate-800 font-medium outline-none focus:border-slate-800">
            {MOCK_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Date
          </h3>
          <input
            type="date"
            defaultValue={getTodayString()}
            className="w-full py-3 px-3 bg-slate-100 rounded-xl border-2 border-transparent text-slate-800 font-medium outline-none focus:border-slate-800"
          />
        </div>
      </div>

      {/* 負担方法 */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Split Method
        </h3>
        <div className="flex gap-2">
          {["均等", "割合", "金額", "全額"].map((method, i) => (
            <button
              key={method}
              className={`flex-1 py-3 text-sm font-bold rounded-xl border-2 transition-all ${
                i === 0
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-400"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          → 3人で均等に分割
        </p>
      </div>

      {/* 詳細オプション */}
      <div className="border-t-2 border-slate-200 pt-4">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="w-full flex items-center justify-between text-slate-500 hover:text-slate-700"
        >
          <span className="text-xs font-bold uppercase tracking-widest">
            Options
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${showOptions ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {showOptions && (
          <div className="space-y-3 mt-4">
            <input
              type="text"
              placeholder="Title"
              className="w-full py-3 px-4 bg-slate-100 rounded-xl border-2 border-transparent text-slate-800 font-medium outline-none focus:border-slate-800 placeholder:text-slate-400"
            />
            <input
              type="text"
              placeholder="Memo"
              className="w-full py-3 px-4 bg-slate-100 rounded-xl border-2 border-transparent text-slate-800 font-medium outline-none focus:border-slate-800 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>

      {/* 送信ボタン */}
      <button className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-colors border-2 border-slate-800">
        SAVE
      </button>
    </div>
  );
}

export default function ExpenseFormDemoPage() {
  const [pattern, setPattern] = useState<StylePattern>("minimal");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("violet");

  return (
    <div className="min-h-screen bg-slate-100">
      {/* パターン切り替え */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 p-3 space-y-3">
        {/* レイアウトパターン */}
        <div className="flex gap-2 max-w-lg mx-auto">
          {[
            { key: "minimal", label: "A. ミニマル" },
            { key: "card", label: "B. カード" },
            { key: "modern", label: "C. モダン" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPattern(p.key as StylePattern)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                pattern === p.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* カラーテーマ */}
        <div className="flex gap-2 max-w-lg mx-auto justify-center">
          {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((theme) => (
            <button
              key={theme}
              onClick={() => setColorTheme(theme)}
              className={`w-8 h-8 rounded-full transition-all ${COLOR_THEMES[theme].preview} ${
                colorTheme === theme
                  ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                  : "opacity-70 hover:opacity-100"
              }`}
              title={COLOR_THEMES[theme].name}
            />
          ))}
        </div>
      </div>

      {/* フォーム表示 */}
      <main className="p-4 max-w-lg mx-auto">
        <div
          className={`rounded-2xl p-5 ${pattern === "card" ? "bg-slate-50" : "bg-white"}`}
        >
          {pattern === "minimal" && <MinimalForm theme={colorTheme} />}
          {pattern === "card" && <CardForm />}
          {pattern === "modern" && <ModernForm />}
        </div>
      </main>

      {/* パターン説明 */}
      <div className="p-4 max-w-lg mx-auto text-sm text-slate-500 space-y-2">
        {pattern === "minimal" && (
          <div>
            <strong>A. ミニマル:</strong>{" "}
            余白多め、ボーダーレス、金額を大きく、横スクロールカテゴリ
          </div>
        )}
        {pattern === "card" && (
          <div>
            <strong>B. カード:</strong>{" "}
            グラデーションヘッダー、カードでグルーピング、シャドウで奥行き
          </div>
        )}
        {pattern === "modern" && (
          <div>
            <strong>C. モダン:</strong>{" "}
            太字フォント、グリッドカテゴリ、英語ラベル、ボーダー強調
          </div>
        )}
      </div>
    </div>
  );
}

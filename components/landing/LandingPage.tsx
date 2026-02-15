"use client";

import Link from "next/link";
import { Users, PieChart, Calculator, Smartphone, Shield } from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "かんたん支出記録",
    description: "金額とカテゴリを選ぶだけ。3タップで記録完了。",
  },
  {
    icon: Users,
    title: "割り勘・傾斜折半",
    description: "均等分割はもちろん、6:4や金額指定の傾斜折半にも対応。",
  },
  {
    icon: PieChart,
    title: "自動精算計算",
    description: "月末に自動で精算額を計算。誰が誰にいくら払うか一目瞭然。",
  },
  {
    icon: Smartphone,
    title: "スマホ最適化",
    description: "PWA対応でアプリのように使える。オフラインでも閲覧可能。",
  },
  {
    icon: Shield,
    title: "安心のセキュリティ",
    description: "データは暗号化して保存。あなたの家計情報を守ります。",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="px-4 py-16 text-center">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Pairbo</h1>
        <p className="text-xl text-slate-600 mb-2">
          割り勘・傾斜折半ができる共有家計簿
        </p>
        <p className="text-slate-500 mb-8">
          同棲カップル・夫婦・シェアハウスに
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            無料で始める
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            ログイン
          </Link>
        </div>

        {/* App Preview */}
        <div className="max-w-sm mx-auto bg-slate-100 rounded-2xl p-4 shadow-inner">
          <div className="bg-white rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">12月の支出</span>
              <span className="text-lg font-bold text-slate-800">¥156,800</span>
            </div>
            <div className="space-y-2">
              {[
                { icon: "🛒", name: "食費", amount: "¥45,200" },
                { icon: "🏠", name: "住居費", amount: "¥80,000" },
                { icon: "🚃", name: "交通費", amount: "¥12,400" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className="text-sm text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {item.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
            シンプルで使いやすい機能
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-12">
            使い方はかんたん
          </h2>
          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "グループを作成",
                description: "パートナーや同居人を招待してグループを作成",
              },
              {
                step: "2",
                title: "支出を記録",
                description: "買い物したら金額とカテゴリを選んで記録",
              },
              {
                step: "3",
                title: "月末に精算",
                description: "アプリが自動計算。精算額を確認して送金するだけ",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="px-4 py-16 bg-slate-800 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">基本機能はすべて無料</h2>
          <p className="text-slate-300 mb-8">
            広告非表示や詳細分析が使えるPremiumプランもあります
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              無料で始める
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              料金プランを見る
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 bg-slate-900 text-slate-400">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="font-bold text-white mb-1">Pairbo</p>
              <p className="text-sm">割り勘・傾斜折半ができる共有家計簿</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                利用規約
              </Link>
              <Link
                href="/legal/tokushoho"
                className="hover:text-white transition-colors"
              >
                特定商取引法に基づく表記
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-slate-800 text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} Pairbo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

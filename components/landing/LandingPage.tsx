"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Link2,
  Scale,
  Smartphone,
  Zap,
  Calculator,
  PieChart,
  CreditCard,
  ChevronDown,
  Check,
  X,
  Minus,
  Globe,
  Clock,
  ArrowRight,
} from "lucide-react";

/* ---------- data ---------- */

const painPoints = [
  {
    icon: Scale,
    title: "負担割合を柔軟に決めたい",
    description:
      "均等割りだけじゃなく、割合や金額を指定して傾斜をつけたいのに、うまくできない。",
  },
  {
    icon: CreditCard,
    title: "共同口座やカードを作るのが面倒",
    description: "お財布は別々がいいけど、共有の支出管理がうまくいかない。",
  },
  {
    icon: Smartphone,
    title: "同じアプリを入れてもらうのが手間",
    description:
      "相手のスマホに合うアプリを探して、インストールしてもらって…ハードルが高い。",
  },
  {
    icon: Calculator,
    title: "月末の精算がストレス",
    description: "結局いくら払えばいいの？ 毎月の計算が面倒すぎる。",
  },
];

const solutions = [
  {
    pain: "負担割合を柔軟に",
    solution: "割合・金額・均等・全額負担から選べる傾斜折半",
    description: "お財布は別のまま、ふたりに合った負担バランスを自由に設定。",
  },
  {
    pain: "共同口座は不要",
    solution: "別々のお財布のまま、支出だけ記録",
    description: "口座もカードもそのまま。支払った人と金額を記録するだけ。",
  },
  {
    pain: "インストールのハードル",
    solution: "URLを送るだけ。ブラウザで完結",
    description:
      "Webアプリだから端末を問わず使える。ホーム画面に追加すればアプリのようにも使える。",
  },
  {
    pain: "精算の手間",
    solution: "月末に自動で精算額を計算",
    description: "誰が誰にいくら払うか一目瞭然。もう計算で悩まない。",
  },
];

const features = [
  {
    icon: Link2,
    title: "URL招待",
    description: "相手にURLを送るだけ。すぐに一緒に始められる。",
  },
  {
    icon: Scale,
    title: "傾斜折半",
    description: "均等・割合・金額指定・全額負担。ふたりに合った方法で。",
  },
  {
    icon: Globe,
    title: "Webアプリ + PWA",
    description:
      "ブラウザで動くからPCでもスマホでも同じ体験。ホーム画面追加でアプリ化。",
  },
  {
    icon: Zap,
    title: "かんたん記録",
    description: "金額とカテゴリを選ぶだけ。サクッと記録できる。",
  },
  {
    icon: Calculator,
    title: "自動精算",
    description: "月末に自動計算。誰が誰にいくら払うか一目瞭然。",
  },
  {
    icon: PieChart,
    title: "分析グラフ",
    description: "カテゴリ別・月別の支出を可視化。",
  },
];

const steps = [
  {
    step: "1",
    title: "グループを作成",
    description: "招待URLをパートナーに送るだけ。アプリのインストールは不要。",
    image: "/screenshots/screenshot-step1.png",
    alt: "Pairbo グループ作成画面 - グループ名を入力して作成",
  },
  {
    step: "2",
    title: "支出を記録",
    description:
      "買い物したら金額とカテゴリを選んで記録。負担方法もその場で選べる。",
    image: "/screenshots/screenshot-step2.png",
    alt: "Pairbo 支出登録フォーム - カテゴリ選択と負担方法の設定",
  },
  {
    step: "3",
    title: "月末に精算",
    description: "自動計算された精算額を確認して送金するだけ。",
    image: "/screenshots/screenshot-step3.png",
    alt: "Pairbo 精算プレビュー - 自動計算された精算額の確認",
  },
];

type ComparisonValue = "yes" | "no" | "partial" | string;

const comparisonRows: {
  label: string;
  pairbo: ComparisonValue;
  app: ComparisonValue;
  sheet: ComparisonValue;
}[] = [
  {
    label: "Webブラウザで利用",
    pairbo: "yes",
    app: "partial",
    sheet: "yes",
  },
  {
    label: "ホーム画面追加でアプリ化（PWA）",
    pairbo: "yes",
    app: "no",
    sheet: "no",
  },
  {
    label: "URLだけで相手を招待",
    pairbo: "yes",
    app: "no",
    sheet: "partial",
  },
  {
    label: "PC・スマホ同じ体験",
    pairbo: "yes",
    app: "partial",
    sheet: "yes",
  },
  {
    label: "常に最新版（更新不要）",
    pairbo: "yes",
    app: "no",
    sheet: "yes",
  },
  {
    label: "ストレージをほぼ使わない",
    pairbo: "yes",
    app: "no",
    sheet: "yes",
  },
];

const testimonials = [
  {
    persona: "同棲カップル（20代）",
    scene: "お財布別・負担割合カスタム",
    quote:
      "お財布は別のまま、ふたりで決めた割合で折半。傾斜折半のおかげで不公平感ゼロ！",
  },
  {
    persona: "新婚夫婦（30代）",
    scene: "生活費を別会計で管理",
    quote: "共有口座を作らなくても大丈夫。URLを送るだけで始められて楽すぎる。",
  },
  {
    persona: "シェアハウス（20代）",
    scene: "光熱費・日用品の割り勘",
    quote: "月末の精算が自動で出るから、もめることがなくなった。",
  },
];

const faqs = [
  {
    q: "本当に無料で使えますか？",
    a: "基本機能はすべて無料です。傾斜折半や詳細分析が使えるPremiumプランもあります。",
  },
  {
    q: "アプリのインストールは必要ですか？",
    a: "不要です。ブラウザからアクセスするだけで使えます。ホーム画面に追加すればネイティブアプリのように使えます（PWA対応）。",
  },
  {
    q: "共有口座が必要ですか？",
    a: "いいえ。お財布は別々のままでOKです。それぞれが支払った支出を記録し、月末に差額を精算する仕組みです。",
  },
  {
    q: "PCでも使えますか？",
    a: "はい。Webアプリなので、PCでもスマホでもブラウザがあればどこでも同じように使えます。",
  },
  {
    q: "2人以上でも使えますか？",
    a: "はい。シェアハウスなど複数人のグループにも対応しています。",
  },
  {
    q: "データのセキュリティは？",
    a: "データは暗号化して保存しています。クレジットカード情報はStripe社が安全に管理します。",
  },
];

/* ---------- component ---------- */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <PainPointsSection />
      <SolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ComparisonSection />
      <TestimonialsSection />
      <PricingCtaSection />
      <FaqSection />
      <FooterSection />
      <StickyCta />
    </div>
  );
}

/* ========== 1. Hero ========== */

function HeroSection() {
  return (
    <section className="px-4 pt-12 pb-16">
      <div className="max-w-2xl mx-auto md:flex md:items-center md:gap-6">
        {/* テキスト */}
        <div className="text-center md:text-left md:w-1/2">
          <p className="inline-block text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-3 py-1 mb-6">
            お財布別カップル・夫婦のための家計簿
          </p>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4 leading-tight">
            ふたりの支出を、
            <br />
            もっとフェアに。
          </h1>

          <p className="text-base text-slate-600 mb-1">
            お財布は別々のまま、支出だけシンプルに管理。
          </p>
          <p className="text-sm text-slate-500 mb-8">
            アプリ不要 · ブラウザで完結 · URLで招待
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mb-10 md:mb-0">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              無料で始める
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              ログイン
            </Link>
          </div>
        </div>

        {/* App Preview — デバイスモックアップ */}
        <div className="md:w-1/2 flex justify-center">
          <div className="w-64">
            <div className="rounded-[2rem] border-4 border-slate-800 bg-slate-800 p-2 shadow-2xl">
              <div className="flex justify-center mb-1">
                <div className="w-20 h-5 bg-slate-800 rounded-b-xl" />
              </div>
              <div className="bg-white rounded-[1.25rem] overflow-hidden">
                <Image
                  src="/screenshots/screenshot-hero.png"
                  alt="Pairbo アプリの支出一覧画面 - カップルの共有家計簿"
                  width={360}
                  height={640}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* バッジ */}
      <div className="flex flex-wrap justify-center gap-4 mt-8 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          アプリ不要
        </span>
        <span className="flex items-center gap-1">
          <Smartphone className="w-3.5 h-3.5" />
          PWA対応
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          登録30秒
        </span>
      </div>
    </section>
  );
}

/* ========== 2. Pain Points ========== */

function PainPointsSection() {
  return (
    <section className="px-4 py-16 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-4">
          こんなお悩みありませんか？
        </h2>
        <p className="text-slate-500 text-center mb-10">
          お財布が別のカップル・夫婦に「あるある」な悩み
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="bg-white rounded-xl p-5 border border-slate-200"
            >
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                <point.icon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{point.title}</h3>
              <p className="text-sm text-slate-600">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 3. Solution ========== */

function SolutionSection() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Pairbo なら、すべて解決。
        </h2>
        <p className="text-slate-500 text-center mb-10">
          お財布は別々のまま、支出だけフェアに管理
        </p>

        <div className="space-y-4">
          {solutions.map((s, i) => (
            <div
              key={s.solution}
              className="flex gap-4 items-start bg-blue-50/50 rounded-xl p-5 border border-blue-100"
            >
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                {i + 1}
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium mb-1">
                  {s.pain} →
                </p>
                <h3 className="font-bold text-slate-800 mb-1">{s.solution}</h3>
                <p className="text-sm text-slate-600">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 4. Features ========== */

function FeaturesSection() {
  return (
    <section className="px-4 py-16 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
          充実の機能
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-5 shadow-sm"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 5. How it Works ========== */

function HowItWorksSection() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
          使い方はかんたん 3ステップ
        </h2>

        <div className="space-y-10">
          {steps.map((item) => (
            <div key={item.step} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                {item.step !== "3" && (
                  <div className="w-px flex-1 bg-blue-200 mt-2" />
                )}
              </div>
              <div className="pb-2">
                <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 6. Comparison ========== */

function ComparisonBadge({ value }: { value: ComparisonValue }) {
  if (value === "yes")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full">
        <Check className="w-4 h-4" />
      </span>
    );
  if (value === "no")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-400 rounded-full">
        <X className="w-4 h-4" />
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 text-slate-400 rounded-full">
        <Minus className="w-4 h-4" />
      </span>
    );
  return <span className="text-sm text-slate-700">{value}</span>;
}

function ComparisonSection() {
  return (
    <section className="px-4 py-16 bg-slate-50">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-3">
          Webアプリだからできること
        </h2>
        <p className="text-slate-500 text-center mb-10">
          ネイティブアプリにはない、Pairbo ならではの強み
        </p>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 pr-4 font-medium text-slate-500 w-2/5">
                  &nbsp;
                </th>
                <th className="py-3 px-2 font-bold text-blue-600 text-center">
                  Pairbo
                </th>
                <th className="py-3 px-2 font-medium text-slate-500 text-center">
                  家計簿アプリ
                </th>
                <th className="py-3 px-2 font-medium text-slate-500 text-center">
                  スプレッド
                  <br className="sm:hidden" />
                  シート
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-3 pr-4 text-slate-700">{row.label}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex justify-center">
                      <ComparisonBadge value={row.pairbo} />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex justify-center">
                      <ComparisonBadge value={row.app} />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex justify-center">
                      <ComparisonBadge value={row.sheet} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ========== 7. Testimonials ========== */

function TestimonialsSection() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          こんなシーンで使われています
        </h2>
        <p className="text-slate-500 text-center mb-10">
          お財布が別のまま、フェアに支出管理
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.persona}
              className="bg-slate-50 rounded-xl p-5 border border-slate-200"
            >
              <p className="text-xs font-medium text-blue-600 mb-1">
                {t.scene}
              </p>
              <p className="text-sm text-slate-700 mb-3">「{t.quote}」</p>
              <p className="text-xs text-slate-400">— {t.persona}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 8. Pricing CTA ========== */

function PricingCtaSection() {
  return (
    <section className="px-4 py-16 bg-slate-800 text-white">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">基本機能はすべて無料</h2>
        <p className="text-slate-300 mb-8">
          広告非表示や詳細分析が使えるPremiumプランもあります
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-800 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            無料で始める
            <ArrowRight className="w-4 h-4" />
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
  );
}

/* ========== 9. FAQ ========== */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 text-left flex items-center justify-between gap-4"
      >
        <span className="font-medium text-slate-800 text-sm">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-600">{a}</div>}
    </div>
  );
}

function FaqSection() {
  return (
    <section className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
          よくある質問
        </h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 10. Footer ========== */

function FooterSection() {
  return (
    <footer className="px-4 py-8 bg-slate-900 text-slate-400">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="font-bold text-white mb-1">Pairbo</p>
            <p className="text-sm">お財布別カップル・夫婦のための共有家計簿</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
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
          <p>&copy; {new Date().getFullYear()} Pairbo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

/* ========== Sticky CTA ========== */

function StickyCta() {
  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 px-4 pb-3 pointer-events-none sm:hidden">
      <Link
        href="/sign-up"
        className="pointer-events-auto flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white font-medium rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        無料で始める
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

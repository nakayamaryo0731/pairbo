import Link from "next/link";
import { FaqItem } from "./FaqItem";
import { Reveal } from "./Reveal";
import { phrases } from "./phrases";
import { zenKaku, zenMaru } from "./fonts";
import {
  Link2,
  Scale,
  Smartphone,
  Zap,
  Calculator,
  PieChart,
  CreditCard,
  Check,
  X,
  Minus,
  Globe,
  ArrowRight,
  ShoppingCart,
  Repeat,
  Copy,
} from "lucide-react";

function PremiumBadge() {
  return (
    <span className="ml-1.5 align-middle inline-block text-[10px] font-bold text-[#B34D6B] bg-[#FDEAEF] rounded-full px-2 py-0.5">
      Premium
    </span>
  );
}

/* ---------- data ---------- */

const painPoints = [
  {
    icon: Scale,
    title: "負担割合を|柔軟に決めたい",
    description:
      "均等割りだけじゃなく、|割合や金額を指定して|傾斜をつけたいのに、|うまくできない。",
  },
  {
    icon: CreditCard,
    title: "共同口座やカードを|作るのが面倒",
    description: "お財布は別々がいいけど、|共有の支出管理が|うまくいかない。",
  },
  {
    icon: Smartphone,
    title: "同じアプリを|入れてもらうのが手間",
    description:
      "相手のスマホに合うアプリを探して、|インストールしてもらって…|ハードルが高い。",
  },
  {
    icon: Calculator,
    title: "月末の精算がストレス",
    description: "結局いくら払えばいいの？|毎月の計算が面倒すぎる。",
  },
];

const solutions = [
  {
    pain: "負担割合を柔軟に",
    solution: "割合・金額・均等・全額負担から|選べる傾斜折半",
    description:
      "お財布は別のまま、|ふたりに合った負担バランスを|自由に設定。|支出ごとに変えることもできる。",
  },
  {
    pain: "共同口座は不要",
    solution: "別々のお財布のまま、|支出だけ記録",
    description: "口座もカードもそのまま。|支払った人と金額を|記録するだけ。",
  },
  {
    pain: "インストールのハードル",
    solution: "URLを送るだけ。|ブラウザで完結",
    description:
      "Webアプリだから端末を問わず使える。|ホーム画面に追加すれば|アプリのようにも使える。",
  },
  {
    pain: "精算の手間",
    solution: "月末に自動で|精算額を計算",
    description:
      "誰が誰にいくら払うか一目瞭然。|金額が小さい月は|翌月への繰り越しもできる。",
  },
];

const features = [
  {
    icon: Link2,
    title: "URL招待",
    description: "相手にURLを送るだけ。|すぐに一緒に始められる。",
    premium: false,
  },
  {
    icon: Scale,
    title: "傾斜折半",
    description: "均等・割合・|金額指定・全額負担。|ふたりに合った方法で。",
    premium: true,
  },
  {
    icon: Calculator,
    title: "自動精算",
    description: "月末に自動計算。|翌月への繰り越しも対応。",
    premium: false,
  },
  {
    icon: Repeat,
    title: "定期支出の自動記録",
    description: "家賃やサブスクは|毎月決まった日に|自動で記録。",
    premium: true,
  },
  {
    icon: ShoppingCart,
    title: "買い物リスト",
    description: "ふたりで共有できるリスト。|買ったらそのまま|支出に記録。",
    premium: false,
  },
  {
    icon: Zap,
    title: "かんたん記録",
    description: "金額とカテゴリを選ぶだけ。|3タップで記録完了。",
    premium: false,
  },
  {
    icon: PieChart,
    title: "分析グラフ",
    description: "カテゴリ別・月別の|支出を可視化。|年次分析も。",
    premium: false,
  },
  {
    icon: Globe,
    title: "Webアプリ + PWA",
    description: "PCでもスマホでも|同じ体験。|ホーム画面追加でアプリ化。",
    premium: false,
  },
];

const subFeatures = [
  "タグ管理",
  "締め日設定（末日対応）",
  "カスタムカテゴリ",
  "Googleスプレッドシート出力",
  "広告非表示（Premium）",
  "複数グループ",
];

type ComparisonValue = "yes" | "no" | "partial";

const comparisonRows: {
  label: string;
  pairbo: ComparisonValue;
  app: ComparisonValue;
  sheet: ComparisonValue;
}[] = [
  { label: "Webブラウザで利用", pairbo: "yes", app: "partial", sheet: "yes" },
  {
    label: "ホーム画面追加でアプリ化（PWA）",
    pairbo: "yes",
    app: "no",
    sheet: "no",
  },
  { label: "URLだけで相手を招待", pairbo: "yes", app: "no", sheet: "partial" },
  { label: "PC・スマホ同じ体験", pairbo: "yes", app: "partial", sheet: "yes" },
  { label: "常に最新版（更新不要）", pairbo: "yes", app: "no", sheet: "yes" },
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
      "お財布は別のまま、|ふたりで決めた割合で折半。|傾斜折半のおかげで|不公平感ゼロ！",
    accent: "rose" as const,
  },
  {
    persona: "新婚夫婦（30代）",
    scene: "生活費を別会計で管理",
    quote:
      "共有口座を|作らなくても大丈夫。|URLを送るだけで|始められて楽すぎる。",
    accent: "blue" as const,
  },
  {
    persona: "シェアハウス（20代）",
    scene: "光熱費・日用品の割り勘",
    quote: "月末の精算が|自動で出るから、|もめることがなくなった。",
    accent: "rose" as const,
  },
];

const faqs = [
  {
    q: "本当に無料で使えますか？",
    a: "基本機能はすべて無料です。傾斜折半や定期支出の自動記録、詳細分析が使えるPremiumプラン（月額¥100・年額¥1,000）もあります。Premiumはどちらか1人の課金でグループ全員が使えます。",
  },
  {
    q: "アプリのインストールは|必要ですか？",
    a: "不要です。ブラウザからアクセスするだけで使えます。スマホのホーム画面に追加すれば、アプリのように使うこともできます。",
  },
  {
    q: "同棲の生活費は|どうやって分担できますか？",
    a: "均等割り・割合指定（傾斜折半）・金額指定・全額負担の4つの方法から選べます。収入差があるカップルでも、ふたりに合った負担バランスを設定できます。",
  },
  {
    q: "共有口座やクレジットカードは|必要ですか？",
    a: "いいえ。お財布は別々のままでOKです。それぞれが支払った支出を記録し、月末に差額を精算する仕組みです。",
  },
  {
    q: "家賃やサブスクなど、|毎月決まった支出は？",
    a: "定期支出として登録すると、毎月決まった日に自動で記録されます（Premium機能）。",
  },
  {
    q: "精算を忘れそう・|面倒になりそうです",
    a: "精算額は月末に自動で計算されます。金額が小さい月や忙しい月は「翌月に繰り越す」を選んで、翌月分とまとめて精算できます。",
  },
  {
    q: "パートナーに|どうやって共有しますか？",
    a: "招待URLを送るだけです。相手はブラウザからすぐに参加できます。",
  },
  {
    q: "PCでも使えますか？",
    a: "はい。ブラウザがあればPCでもスマホでもどこでも同じように使えます。",
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
    <div
      className={`${zenMaru.variable} ${zenKaku.variable} font-kaku min-h-screen bg-white text-[#43373C]`}
    >
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

/* ========== ロゴ ========== */

function PairDots({ size = "w-4 h-4" }: { size?: string }) {
  return (
    <span className="inline-flex" aria-hidden>
      <span className={`${size} rounded-full bg-[#EE6B8D]`} />
      <span
        className={`${size} rounded-full bg-[#4D9DE8] -ml-1.5 mix-blend-multiply`}
      />
    </span>
  );
}

/* ========== 1. Hero ========== */

const heroExpenses = [
  {
    icon: "🛒",
    name: "スーパー",
    meta: "9/2・たろう",
    amount: "¥1,185",
    split: 60,
    payer: "rose",
  },
  {
    icon: "🏠",
    name: "家賃",
    meta: "9/1・たろう・定期",
    amount: "¥120,000",
    split: 60,
    payer: "rose",
  },
  {
    icon: "🧻",
    name: "日用品",
    meta: "9/5・はなこ",
    amount: "¥660",
    split: 50,
    payer: "blue",
  },
  {
    icon: "🍜",
    name: "外食",
    meta: "9/8・はなこ・全額",
    amount: "¥8,980",
    split: 0,
    payer: "blue",
  },
  {
    icon: "✈️",
    name: "旅行",
    meta: "9/13・たろう",
    amount: "¥15,000",
    split: 70,
    payer: "rose",
  },
] as const;

function HeroPhone() {
  return (
    <div className="relative px-8 py-6">
      {/* スマホ本体 */}
      <div className="w-63 rotate-[2.5deg] rounded-[34px] border border-[#F6DDE4] bg-white p-2 shadow-[0_34px_70px_-28px_rgba(179,77,107,0.5)]">
        <div className="rounded-[27px] bg-[#FFFDFC] overflow-hidden">
          <div className="flex items-center justify-start gap-1.5 px-4 pt-3.5 pb-2 text-[12.5px] font-bold">
            <PairDots size="w-2.5 h-2.5" />
            たろう & はなこ
          </div>
          <div className="mx-3.5 mt-1 mb-2.5 flex items-baseline justify-between rounded-xl bg-[#FDF1F4] px-3 py-2">
            <span className="text-[10.5px] font-bold text-[#B34D6B]">
              9月分・5件
            </span>
            <span className="text-base font-black tabular-nums">¥145,825</span>
          </div>
          <div className="grid gap-1.5 px-3 pb-3.5">
            {heroExpenses.map((e) => (
              <div
                key={e.name}
                className="flex items-center gap-2 rounded-[13px] border border-[#F2E7EA] px-2.5 py-2"
                style={{
                  // 行背景を負担割合で2色に塗り分け（実UIと同じ表現）
                  background: `linear-gradient(90deg, #FDECF1 ${e.split}%, #E9F3FD ${e.split}%)`,
                }}
              >
                <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-[10px] bg-white text-[15px] shadow-[0_1px_3px_rgba(120,80,95,0.18)]">
                  {e.icon}
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="block truncate text-xs font-bold">
                    {e.name}
                  </span>
                  <span className="flex items-center gap-1 truncate text-[9px] font-medium text-[#A49399]">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${e.payer === "rose" ? "bg-[#EE6B8D]" : "bg-[#4D9DE8]"}`}
                    />
                    {e.meta}
                  </span>
                </span>
                <span className="text-[12.5px] font-black tabular-nums">
                  {e.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 精算カード */}
      <div className="absolute top-1 -right-1.5 -rotate-2 animate-[lp-bob_6s_ease-in-out_infinite] motion-reduce:animate-none rounded-2xl border border-[#F6E3E9] bg-white px-3.5 py-3 text-[11px] leading-snug shadow-[0_18px_40px_-18px_rgba(120,80,95,0.45)]">
        <span className="mb-1 block text-[9.5px] font-bold tracking-wide text-[#A49399]">
          今月の精算
        </span>
        <span className="text-[11.5px] font-bold">はなこ → たろう</span>
        <span className="my-0.5 mb-1.5 block font-maru text-[19px] font-black tabular-nums">
          ¥12,340
        </span>
        <span className="inline-block rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] px-3.5 py-1 text-[10.5px] font-bold text-white">
          精算する
        </span>
      </div>

      {/* 負担割合カード */}
      <div className="absolute bottom-2 -left-2.5 rotate-2 animate-[lp-bob_7s_ease-in-out_0.8s_infinite] motion-reduce:animate-none rounded-2xl border border-[#F6E3E9] bg-white px-3.5 py-3 text-[11px] leading-snug shadow-[0_18px_40px_-18px_rgba(120,80,95,0.45)]">
        <span className="mb-1 block text-[9.5px] font-bold tracking-wide text-[#A49399]">
          負担割合
        </span>
        <span className="my-1 flex h-2.5 w-33 overflow-hidden rounded-full">
          <span className="bg-[#EE6B8D]" style={{ flex: 6 }} />
          <span className="bg-[#4D9DE8]" style={{ flex: 4 }} />
        </span>
        <span className="text-[10px] font-bold text-[#8D7F85]">
          たろう 60% ・ はなこ 40%
        </span>
        <span className="mt-1 block text-[9px] font-medium text-[#A49399]">
          リストの色分け＝ふたりの負担分
        </span>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#FFF8F4] px-5 pt-14 pb-16">
      {/* 背景ブロブ */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-30 -right-20 h-105 w-105 rounded-full bg-[#EE6B8D] opacity-35 blur-[60px]" />
        <div className="absolute -bottom-40 right-40 h-95 w-95 rounded-full bg-[#4D9DE8] opacity-35 blur-[60px]" />
      </div>

      <div className="relative mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
        <div className="text-center md:text-left">
          <p className="mb-6 inline-flex items-center gap-2 font-maru text-lg font-black">
            <PairDots />
            Pairbo
          </p>
          <p className="mb-4">
            <span className="inline-block rounded-full bg-[#FDEAEF] px-3.5 py-1.5 text-[12.5px] font-bold text-[#B34D6B]">
              {phrases("同棲カップル・夫婦のための|無料共有家計簿")}
            </span>
          </p>

          <h1 className="mb-4 font-maru text-[clamp(26px,8.6vw,32px)] leading-[1.35] font-black tracking-wide sm:text-4xl md:text-[42px]">
            <span className="inline-block">ふたりのお金、</span>
            <br />
            <span className="inline-block">
              <span className="text-[#EE6B8D]">ちょうど</span>
              <span className="text-[#4D9DE8]">いい</span>折半。
            </span>
          </h1>

          <p className="mb-1.5 text-base">
            {phrases(
              "お財布は別々のまま。|割り勘も、|収入に合わせた|傾斜折半も、|記録するだけで|自動精算。",
            )}
          </p>
          <p className="mb-7 text-[13.5px] text-[#8D7F85]">
            {phrases("無料で使える ・ |アプリ不要 ・ |URLで招待")}
          </p>

          <div className="mb-7 flex flex-col items-center gap-3 sm:flex-row md:items-start">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] px-8 py-3.5 font-maru font-bold text-white shadow-[0_12px_28px_-12px_rgba(238,107,141,0.6)] transition-transform hover:scale-[1.03]"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center border-b-2 border-[#4D9DE8] pb-0.5 text-sm font-bold transition-opacity hover:opacity-70"
            >
              ログイン
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:justify-start">
            {[
              "3タップで記録",
              "月末に自動精算",
              "買い物リスト共有",
              "定期支出も自動で",
            ].map((chip, i) => (
              <span
                key={chip}
                className={`rounded-full border-[1.5px] bg-white px-3 py-1 text-xs font-bold ${
                  i % 2 === 0
                    ? "border-[#F3D3DC] text-[#96525F]"
                    : "border-[#CFE3F8] text-[#40719F]"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <HeroPhone />
        </div>
      </div>
    </section>
  );
}

/* ========== 2. Pain Points ========== */

function PainPointsSection() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="mb-3 text-center font-maru text-2xl font-black">
            {phrases("こんなお悩み|ありませんか？")}
          </h2>
          <p className="mb-10 text-center text-[#8D7F85]">
            {phrases("お財布が別のカップル・夫婦に|「あるある」な悩み")}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {painPoints.map((point, i) => (
            <Reveal key={point.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-[#F2E7EA] bg-white p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDEAEF]">
                  <point.icon className="h-5 w-5 text-[#EE6B8D]" />
                </div>
                <h3 className="mb-1 font-bold">{phrases(point.title)}</h3>
                <p className="text-sm text-[#6E6167]">
                  {phrases(point.description)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 3. Solution ========== */

function SolutionSection() {
  return (
    <section className="bg-gradient-to-b from-[#FFF8F4] to-[#F5F9FE] px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="mb-2 text-center font-maru text-2xl font-black">
            {phrases("Pairbo なら、|すべて解決。")}
          </h2>
          <p className="mb-10 text-center text-[#8D7F85]">
            {phrases("お財布は別々のまま、|支出だけフェアに管理")}
          </p>
        </Reveal>

        <div className="space-y-4">
          {solutions.map((s, i) => (
            <Reveal key={s.solution} delay={i * 80}>
              <div className="flex items-start gap-4 rounded-2xl border border-white bg-white/70 p-5 shadow-[0_8px_24px_-16px_rgba(120,80,95,0.3)]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EE6B8D] to-[#4D9DE8] font-maru text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold text-[#B34D6B]">
                    {s.pain} →
                  </p>
                  <h3 className="mb-1 font-bold">{phrases(s.solution)}</h3>
                  <p className="text-sm text-[#6E6167]">
                    {phrases(s.description)}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 4. Features ========== */

function FeaturesSection() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <h2 className="mb-10 text-center font-maru text-2xl font-black">
            充実の機能
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={(i % 4) * 60}>
              <div className="h-full rounded-2xl border border-[#F2E7EA] bg-white p-5">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${i % 2 === 0 ? "bg-[#FDEAEF]" : "bg-[#E7F1FC]"}`}
                >
                  <feature.icon
                    className={`h-5 w-5 ${i % 2 === 0 ? "text-[#EE6B8D]" : "text-[#4D9DE8]"}`}
                  />
                </div>
                <h3 className="mb-1 text-[15px] font-bold">
                  {feature.title}
                  {feature.premium && <PremiumBadge />}
                </h3>
                <p className="text-[13px] text-[#6E6167]">
                  {phrases(feature.description)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold text-[#A49399]">ほかにも:</span>
            {subFeatures.map((f) => (
              <span
                key={f}
                className="rounded-full bg-[#F7F2F0] px-3 py-1 text-xs font-medium text-[#6E6167]"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ========== 5. How it Works ========== */

function MiniInvite() {
  return (
    <div className="rounded-2xl border border-[#F2E7EA] bg-white p-4 text-[12px] shadow-[0_12px_30px_-20px_rgba(120,80,95,0.4)]">
      <p className="mb-1 text-[10px] font-bold text-[#A49399]">グループ名</p>
      <p className="mb-3 rounded-lg bg-[#F7F2F0] px-3 py-2 font-bold">
        ふたりの家計簿
      </p>
      <p className="mb-1 text-[10px] font-bold text-[#A49399]">招待リンク</p>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#CFE3F8] bg-[#F5F9FE] px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-medium text-[#40719F]">
          pairbo.app/invite/a8x2…
        </span>
        <Copy className="h-3.5 w-3.5 shrink-0 text-[#4D9DE8]" />
      </div>
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDEAEF] px-2.5 py-1 text-[11px] font-bold text-[#B34D6B]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#EE6B8D]" />
          たろう
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F1FC] px-2.5 py-1 text-[11px] font-bold text-[#40719F]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4D9DE8]" />
          はなこ が参加しました
        </span>
      </div>
    </div>
  );
}

function MiniExpenseForm() {
  return (
    <div className="rounded-2xl border border-[#F2E7EA] bg-white p-4 text-[12px] shadow-[0_12px_30px_-20px_rgba(120,80,95,0.4)]">
      <p className="mb-1 text-[10px] font-bold text-[#A49399]">金額</p>
      <p className="mb-3 font-maru text-[22px] font-black tabular-nums">
        ¥3,480
      </p>
      <p className="mb-1 text-[10px] font-bold text-[#A49399]">カテゴリ</p>
      <div className="mb-3 flex gap-1.5">
        <span className="rounded-full bg-[#EE6B8D] px-3 py-1 text-[11px] font-bold text-white">
          🍱 食費
        </span>
        <span className="rounded-full bg-[#F7F2F0] px-3 py-1 text-[11px] font-medium text-[#6E6167]">
          🧻 日用品
        </span>
        <span className="rounded-full bg-[#F7F2F0] px-3 py-1 text-[11px] font-medium text-[#6E6167]">
          🍜 外食
        </span>
      </div>
      <p className="mb-1 text-[10px] font-bold text-[#A49399]">負担割合</p>
      <div className="mb-1 flex h-2.5 overflow-hidden rounded-full">
        <span className="bg-[#EE6B8D]" style={{ flex: 6 }} />
        <span className="bg-[#4D9DE8]" style={{ flex: 4 }} />
      </div>
      <p className="mb-3 text-[10px] font-bold text-[#8D7F85]">
        たろう 60% ・ はなこ 40%
      </p>
      <span className="block rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] py-2 text-center text-[12px] font-bold text-white">
        記録する
      </span>
    </div>
  );
}

function MiniSettlement() {
  return (
    <div className="rounded-2xl border border-[#F2E7EA] bg-white p-4 text-[12px] shadow-[0_12px_30px_-20px_rgba(120,80,95,0.4)]">
      <p className="mb-2 text-[10px] font-bold text-[#A49399]">9月の精算</p>
      <div className="mb-3 rounded-xl bg-gradient-to-r from-[#FDECF1] to-[#E9F3FD] px-3 py-3 text-center">
        <p className="mb-0.5 font-bold">はなこ → たろう</p>
        <p className="font-maru text-[22px] font-black tabular-nums">¥12,340</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <span className="rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] py-2 text-center text-[11.5px] font-bold text-white">
          精算する
        </span>
        <span className="rounded-full border border-[#E5D8DC] py-2 text-center text-[11.5px] font-bold text-[#8D7F85]">
          翌月に繰り越す
        </span>
      </div>
    </div>
  );
}

const steps = [
  {
    step: "1",
    title: "グループを作成",
    description: "招待URLをパートナーに送るだけ。|アプリのインストールは不要。",
    visual: MiniInvite,
  },
  {
    step: "2",
    title: "支出を記録",
    description:
      "買い物したら金額とカテゴリを|選んで記録。|負担方法もその場で選べる。",
    visual: MiniExpenseForm,
  },
  {
    step: "3",
    title: "月末に精算",
    description:
      "自動計算された精算額を確認して|送金するだけ。|翌月への繰り越しもできる。",
    visual: MiniSettlement,
  },
];

function HowItWorksSection() {
  return (
    <section className="bg-[#FFF8F4] px-5 py-16">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <h2 className="mb-10 text-center font-maru text-2xl font-black">
            {phrases("使い方はかんたん、|3ステップ")}
          </h2>
        </Reveal>

        <div className="space-y-10">
          {steps.map((item) => (
            <Reveal key={item.step}>
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EE6B8D] to-[#4D9DE8] font-maru font-bold text-white">
                    {item.step}
                  </div>
                  {item.step !== "3" && (
                    <div className="mt-2 w-px flex-1 bg-gradient-to-b from-[#F3D3DC] to-[#CFE3F8]" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <h3 className="mb-1 font-bold">{item.title}</h3>
                  <p className="mb-3 text-sm text-[#6E6167]">
                    {phrases(item.description)}
                  </p>
                  <div className="max-w-xs">
                    <item.visual />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 6. Comparison ========== */

function ComparisonBadge({
  value,
  highlight = false,
}: {
  value: ComparisonValue;
  highlight?: boolean;
}) {
  if (value === "yes")
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
          highlight
            ? "bg-gradient-to-br from-[#EE6B8D] to-[#4D9DE8] text-white"
            : "bg-[#F0EBE9] text-[#8D7F85]"
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  if (value === "no")
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F0EBE9] text-[#C4B8BC]">
        <X className="h-4 w-4" />
      </span>
    );
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F0EBE9] text-[#C4B8BC]">
      <Minus className="h-4 w-4" />
    </span>
  );
}

function ComparisonSection() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="mb-3 text-center font-maru text-2xl font-black">
            {phrases("Webアプリだから|できること")}
          </h2>
          <p className="mb-10 text-center text-[#8D7F85]">
            {phrases("ネイティブアプリにはない、|Pairbo ならではの強み")}
          </p>
        </Reveal>

        <Reveal>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className="border-b border-[#F2E7EA]">
                  <th className="w-2/5 py-3 pr-4 text-left font-medium text-[#A49399]">
                    &nbsp;
                  </th>
                  <th className="px-2 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5 font-maru font-black">
                      <PairDots size="w-2.5 h-2.5" />
                      Pairbo
                    </span>
                  </th>
                  <th className="px-2 py-3 text-center font-medium text-[#A49399]">
                    家計簿アプリ
                  </th>
                  <th className="px-2 py-3 text-center font-medium text-[#A49399]">
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
                    className="border-b border-[#F7F2F0] last:border-0"
                  >
                    <td className="py-3 pr-4">{row.label}</td>
                    <td className="bg-[#FFF8F4]/60 px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <ComparisonBadge value={row.pairbo} highlight />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <ComparisonBadge value={row.app} />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <ComparisonBadge value={row.sheet} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ========== 7. Testimonials ========== */

function TestimonialsSection() {
  return (
    <section className="bg-[#F5F9FE] px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="mb-2 text-center font-maru text-2xl font-black">
            こんなシーンで活躍
          </h2>
          <p className="mb-10 text-center text-[#8D7F85]">
            {phrases("お財布が別のまま、|フェアに支出管理")}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.persona} delay={i * 80}>
              <div
                className={`h-full rounded-2xl border-t-4 bg-white p-5 shadow-[0_8px_24px_-16px_rgba(120,80,95,0.3)] ${
                  t.accent === "rose"
                    ? "border-t-[#EE6B8D]"
                    : "border-t-[#4D9DE8]"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-bold ${t.accent === "rose" ? "text-[#B34D6B]" : "text-[#40719F]"}`}
                >
                  {t.scene}
                </p>
                <p className="mb-3 text-sm">{phrases(`「${t.quote}」`)}</p>
                <p className="text-xs text-[#A49399]">— {t.persona}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ========== 8. Pricing CTA ========== */

function PricingCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#43373C] px-5 py-16 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#EE6B8D] opacity-20 blur-[70px]" />
        <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-[#4D9DE8] opacity-20 blur-[70px]" />
      </div>
      <div className="relative mx-auto max-w-2xl text-center">
        <Reveal>
          <h2 className="mb-3 font-maru text-2xl font-black">
            {phrases("基本機能は、|ずっと無料。")}
          </h2>
          <p className="mb-8 text-[15px] text-white/70">
            {phrases(
              "傾斜折半や定期支出などが使える|Premiumも月額¥100|（年払いなら¥1,000）。|1人分の課金で、|グループ全員が使えます。",
            )}
          </p>

          <div className="mx-auto mb-8 grid max-w-md grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-white/8 p-4 backdrop-blur">
              <p className="mb-1 text-xs font-bold text-white/60">Free</p>
              <p className="mb-1 font-maru text-2xl font-black tabular-nums">
                ¥0
              </p>
              <p className="text-xs text-white/70">
                {phrases("記録・精算・|買い物リストなど|基本機能")}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-[#EE6B8D]/25 to-[#4D9DE8]/25 p-4 ring-1 ring-white/15">
              <p className="mb-1 text-xs font-bold text-white/60">Premium</p>
              <p className="mb-1 font-maru text-2xl font-black tabular-nums">
                ¥100
                <span className="text-sm font-bold text-white/60">/月</span>
              </p>
              <p className="text-xs text-white/70">
                {phrases("傾斜折半・|定期支出・|詳細分析・|広告非表示")}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] px-8 py-3.5 font-maru font-bold text-white transition-transform hover:scale-[1.03]"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              料金プランを見る
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ========== 9. FAQ ========== */

function FaqSection() {
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <h2 className="mb-10 text-center font-maru text-2xl font-black">
            よくある質問
          </h2>
        </Reveal>
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
    <footer className="bg-[#352B2F] px-5 py-8 text-[#B5A8AC]">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="mb-1 inline-flex items-center gap-1.5 font-maru font-black text-white">
              <PairDots size="w-3 h-3" />
              Pairbo
            </p>
            <p className="text-sm">
              {phrases(
                "同棲・二人暮らしの|カップル・夫婦向け|共有家計簿アプリ",
              )}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              利用規約
            </Link>
            <Link
              href="/legal/tokushoho"
              className="transition-colors hover:text-white"
            >
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Pairbo. All rights reserved.</p>
          <div className="flex gap-4">
            <a
              href="https://x.com/RONnakayama"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              X（Twitter）
            </a>
            <a
              href="https://zenn.dev/r0nr0n"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Zenn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ========== Sticky CTA ========== */

function StickyCta() {
  return (
    <div className="pointer-events-none fixed right-0 bottom-14 left-0 z-40 px-4 pb-3 sm:hidden">
      <Link
        href="/sign-up"
        className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] py-3 font-maru font-bold text-white shadow-lg"
      >
        無料で始める
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

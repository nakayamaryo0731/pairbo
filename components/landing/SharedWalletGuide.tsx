import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "./Reveal";
import { phrases } from "./phrases";
import { zenKaku, zenMaru } from "./fonts";
import {
  FooterSection,
  HowItWorksSection,
  PairDots,
  StickyCta,
} from "./LandingPage";

/* ---------- data ---------- */

const methodLabels = [
  "しくみ",
  "準備",
  "支払い方法",
  "負担の割合",
  "向いている人",
];

const methods = [
  {
    name: "共同口座",
    values: [
      "ふたりで1つの口座に|生活費を入れて、|そこから払う",
      "口座の開設と|毎月の入金",
      "口座のカードや|引き落とし",
      "入金額で調整",
      "生活費を|まとめて管理したい",
    ],
    pairbo: false,
  },
  {
    name: "共同財布アプリ・|プリペイドカード",
    values: [
      "ふたりでチャージした|残高やカードで払う",
      "アプリの登録と|毎月のチャージ",
      "共通のカードや残高",
      "チャージ額で調整",
      "支払いを|1か所にまとめたい",
    ],
    pairbo: false,
  },
  {
    name: "各自で払って|記録・精算",
    values: [
      "いつも通り各自で払い、|記録して月ごとに|差額をやりとりする",
      "アプリに記録するだけ",
      "各自のいつものカード・|現金・ポイント",
      "支出ごとに変えられる",
      "お財布は別々のまま、|公平に分けたい",
    ],
    pairbo: true,
  },
];

const fits = [
  "お財布や口座は|別々にしておきたい",
  "いつものカードやポイントを|そのまま使いたい",
  "収入差に合わせて、|負担の割合を調整したい",
  "口座開設やチャージの|手間をかけたくない",
];

const faqs = [
  {
    q: "共同口座がなくても|生活費を分けられますか？",
    a: "はい。それぞれが払った支出を記録すると、月ごとにどちらがいくら払えばよいかを自動で計算します。",
  },
  {
    q: "収入に差があっても|公平に分けられますか？",
    a: "均等割り・全額負担に加えて、割合や金額を指定する傾斜折半（Premium）で、ふたりに合った負担にできます。",
  },
  {
    q: "相手もアプリを|インストールする必要がありますか？",
    a: "いいえ。招待URLを送るだけで、ブラウザからすぐに参加できます。",
  },
  {
    q: "無料で使えますか？",
    a: "記録・精算などの基本機能は無料です。",
  },
];

/* ---------- component ---------- */

export function SharedWalletGuide() {
  return (
    <div
      className={`${zenMaru.variable} ${zenKaku.variable} font-kaku min-h-screen bg-white text-[#43373C]`}
    >
      <header className="px-5 pt-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-maru text-lg font-black"
          >
            <PairDots />
            Pairbo
          </Link>
        </div>
      </header>

      <main>
        <section className="px-5 pt-10 pb-14">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-5 font-maru text-[clamp(24px,7.4vw,30px)] leading-[1.4] font-black sm:text-4xl">
              {phrases("ふたりのお金、|共同財布にする？|別々のままにする？")}
            </h1>
            <p className="text-[15px] leading-relaxed text-[#6E6167]">
              {phrases(
                "同棲や結婚で|生活費を一緒に払うようになると、|まずお金の分け方に悩みます。|ふたりのお金を管理する方法は、|大きく分けて3つあります。",
              )}
            </p>
          </div>
        </section>

        <section className="bg-gradient-to-b from-[#FFF8F4] to-[#F5F9FE] px-5 py-16">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2 className="mb-10 text-center font-maru text-2xl font-black">
                {phrases("ふたりのお金を|管理する3つの方法")}
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {methods.map((method, i) => (
                <Reveal key={method.name} delay={i * 80}>
                  <div
                    className={`h-full rounded-2xl bg-white p-5 ${
                      method.pairbo
                        ? "shadow-[0_8px_24px_-16px_rgba(120,80,95,0.3)] ring-2 ring-[#EE6B8D]/50"
                        : "border border-[#F2E7EA]"
                    }`}
                  >
                    <p className="mb-1 flex items-center gap-2 text-xs font-bold text-[#A49399]">
                      方法{i + 1}
                      {method.pairbo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FDEAEF] px-2 py-0.5 text-[10px] text-[#B34D6B]">
                          <PairDots size="w-2 h-2" />
                          Pairbo
                        </span>
                      )}
                    </p>
                    <h3 className="mb-4 font-bold">{phrases(method.name)}</h3>
                    <dl className="space-y-3 text-sm">
                      {methodLabels.map((label, j) => (
                        <div key={label}>
                          <dt className="mb-0.5 text-xs font-bold text-[#B34D6B]">
                            {label}
                          </dt>
                          <dd className="text-[#6E6167]">
                            {phrases(method.values[j])}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="mb-8 text-center font-maru text-2xl font-black">
                {phrases("「各自で払って記録・精算」が|向いている人")}
              </h2>
              <ul className="space-y-3">
                {fits.map((fit) => (
                  <li
                    key={fit}
                    className="flex items-start gap-3 rounded-xl border border-[#F2E7EA] bg-white p-4 text-sm font-bold"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EE6B8D] to-[#4D9DE8] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{phrases(fit)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-center text-[15px]">
                {phrases(
                  "Pairboなら、|支出を記録するだけで|月ごとの精算額を|自動で計算します。",
                )}
              </p>
            </Reveal>
          </div>
        </section>

        <HowItWorksSection />

        <section className="px-5 py-16">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="mb-10 text-center font-maru text-2xl font-black">
                よくある質問
              </h2>
            </Reveal>
            <dl className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-xl border border-[#F2E7EA] bg-white p-4"
                >
                  <dt className="mb-1.5 text-sm font-bold">{phrases(faq.q)}</dt>
                  <dd className="text-sm text-[#6E6167]">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#43373C] px-5 py-16 text-center text-white">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#EE6B8D] opacity-20 blur-[70px]" />
            <div className="absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-[#4D9DE8] opacity-20 blur-[70px]" />
          </div>
          <div className="relative mx-auto max-w-2xl">
            <h2 className="mb-3 font-maru text-2xl font-black">
              {phrases("基本機能は、|ずっと無料。")}
            </h2>
            <p className="mb-8 text-[15px] text-white/70">
              {phrases("URLを送るだけで、|ふたりですぐに始められます。")}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EE6B8D] to-[#4D9DE8] px-8 py-3.5 font-maru font-bold text-white transition-transform hover:scale-[1.03]"
              >
                無料で始める
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-8 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
              >
                Pairboの機能を見る
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
      <StickyCta />
    </div>
  );
}

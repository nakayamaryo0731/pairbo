import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | Pairbo",
  description: "Pairboの利用規約",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 mb-8 inline-block"
        >
          &larr; トップに戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-8">利用規約</h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <p className="text-slate-600">
            この利用規約（以下「本規約」）は、Pairbo（以下「当サービス」）の利用条件を定めるものです。
            ユーザーは、本規約に同意した上で当サービスを利用するものとします。
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第1条（適用）
            </h2>
            <p className="text-slate-600">
              本規約は、ユーザーと当サービスの運営者との間の、当サービスの利用に関わる一切の関係に適用されます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第2条（利用登録）
            </h2>
            <ol className="list-decimal list-inside text-slate-600 space-y-2">
              <li>
                利用登録は、登録希望者が本規約に同意の上、所定の方法で申請し、運営者がこれを承認することによって完了します。
              </li>
              <li>
                運営者は、以下の場合に利用登録を拒否することがあります。
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>虚偽の情報を提供した場合</li>
                  <li>過去に本規約に違反したことがある場合</li>
                  <li>その他、運営者が不適切と判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第3条（アカウント管理）
            </h2>
            <ol className="list-decimal list-inside text-slate-600 space-y-2">
              <li>
                ユーザーは、自己の責任において、アカウント情報を適切に管理するものとします。
              </li>
              <li>
                アカウント情報の管理不十分、使用上の過誤、第三者の使用等による損害の責任はユーザーが負うものとします。
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第4条（禁止事項）
            </h2>
            <p className="text-slate-600 mb-2">
              ユーザーは、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>
                当サービスのサーバーやネットワークに過度な負荷をかける行為
              </li>
              <li>当サービスの運営を妨害する行為</li>
              <li>他のユーザーの情報を不正に収集する行為</li>
              <li>他のユーザーになりすます行為</li>
              <li>当サービスに関連して、反社会的勢力に利益を供与する行為</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第5条（サービスの提供）
            </h2>
            <ol className="list-decimal list-inside text-slate-600 space-y-2">
              <li>
                当サービスは、現状有姿で提供されます。運営者は、サービスの完全性、正確性、有用性等について保証しません。
              </li>
              <li>
                運営者は、以下の場合にサービスの全部または一部を中断・停止することがあります。
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>システムの保守・点検を行う場合</li>
                  <li>天災、停電等の不可抗力による場合</li>
                  <li>その他、運営上必要と判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第6条（有料プラン）
            </h2>
            <ol className="list-decimal list-inside text-slate-600 space-y-2">
              <li>
                有料プラン（Premiumプラン）の料金は、料金ページに記載のとおりです。
              </li>
              <li>ユーザーは、Stripeを通じて料金を支払うものとします。</li>
              <li>
                サブスクリプションは、ユーザーが解約するまで自動的に更新されます。
              </li>
              <li>
                解約後も、支払い済みの期間が終了するまでは有料プランをご利用いただけます。
              </li>
              <li>支払い済みの料金は、原則として返金されません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第7条（知的財産権）
            </h2>
            <p className="text-slate-600">
              当サービスに関する知的財産権は、運営者または正当な権利者に帰属します。
              ユーザーは、当サービスを利用することにより、これらの権利を取得するものではありません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第8条（免責事項）
            </h2>
            <ol className="list-decimal list-inside text-slate-600 space-y-2">
              <li>
                運営者は、当サービスの利用により生じた損害について、一切の責任を負いません。
              </li>
              <li>
                当サービスで計算される精算金額は参考値です。実際の送金・精算は、ユーザーの責任で行ってください。
              </li>
              <li>ユーザー間のトラブルについて、運営者は一切関与しません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第9条（サービスの変更・終了）
            </h2>
            <p className="text-slate-600">
              運営者は、ユーザーへの事前の通知なく、当サービスの内容を変更したり、当サービスの提供を終了することができます。
              これによりユーザーに生じた損害について、運営者は一切の責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第10条（利用規約の変更）
            </h2>
            <p className="text-slate-600">
              運営者は、必要に応じて本規約を変更することがあります。
              変更後の規約は、当サービス上に掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              第11条（準拠法・管轄）
            </h2>
            <p className="text-slate-600">
              本規約の解釈にあたっては、日本法を準拠法とします。
              当サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <div className="pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              制定日：2026年1月1日
              <br />
              最終更新日：2026年1月1日
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

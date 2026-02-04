import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | Pairbo",
  description: "Pairboの特定商取引法に基づく表記",
};

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 mb-8 inline-block"
        >
          &larr; トップに戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-8">
          特定商取引法に基づく表記
        </h1>

        <div className="space-y-6">
          <table className="w-full">
            <tbody className="divide-y divide-slate-200">
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top w-1/3">
                  販売事業者
                </th>
                <td className="py-4 text-slate-800">
                  {/* TODO: 実際の事業者名を入力 */}
                  [事業者名を入力]
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  運営責任者
                </th>
                <td className="py-4 text-slate-800">
                  {/* TODO: 実際の責任者名を入力 */}
                  [責任者名を入力]
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  所在地
                </th>
                <td className="py-4 text-slate-800">
                  {/* TODO: 実際の住所を入力（請求があれば開示する旨の記載でも可） */}
                  請求があった場合に遅滞なく開示いたします。
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  電話番号
                </th>
                <td className="py-4 text-slate-800">
                  {/* TODO: 実際の電話番号を入力（請求があれば開示する旨の記載でも可） */}
                  請求があった場合に遅滞なく開示いたします。
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  メールアドレス
                </th>
                <td className="py-4 text-slate-800">
                  {/* TODO: 実際のメールアドレスを入力 */}
                  [メールアドレスを入力]
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  販売価格
                </th>
                <td className="py-4 text-slate-800">
                  <p>
                    Premiumプラン：月額300円（税込）または年額2,400円（税込）
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    ※ 最新の価格は
                    <Link
                      href="/pricing"
                      className="text-blue-500 hover:underline"
                    >
                      料金ページ
                    </Link>
                    をご確認ください。
                  </p>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  商品代金以外の必要料金
                </th>
                <td className="py-4 text-slate-800">
                  なし
                  <p className="text-sm text-slate-500 mt-1">
                    ※ インターネット接続料金等はお客様のご負担となります。
                  </p>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  お支払い方法
                </th>
                <td className="py-4 text-slate-800">
                  クレジットカード（Visa、Mastercard、American Express、JCB）
                  <p className="text-sm text-slate-500 mt-1">
                    ※ 決済はStripe社のシステムを利用しています。
                  </p>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  お支払い時期
                </th>
                <td className="py-4 text-slate-800">
                  お申し込み時に決済されます。以降、月払いの場合は毎月同日、年払いの場合は毎年同日に自動更新されます。
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  サービス提供時期
                </th>
                <td className="py-4 text-slate-800">
                  決済完了後、即時ご利用いただけます。
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  返品・キャンセル
                </th>
                <td className="py-4 text-slate-800">
                  <p>
                    デジタルサービスの性質上、お支払い後の返金には原則として応じかねます。
                  </p>
                  <p className="mt-2">
                    サブスクリプションの解約はいつでも可能です。解約後も、お支払い済みの期間終了まではサービスをご利用いただけます。
                  </p>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left text-sm font-medium text-slate-500 align-top">
                  動作環境
                </th>
                <td className="py-4 text-slate-800">
                  <p>推奨ブラウザ：</p>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    <li>Google Chrome（最新版）</li>
                    <li>Safari（最新版）</li>
                    <li>Firefox（最新版）</li>
                    <li>Microsoft Edge（最新版）</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-500">最終更新日：2026年1月1日</p>
          </div>
        </div>
      </div>
    </div>
  );
}

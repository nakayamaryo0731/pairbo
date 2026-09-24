import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Pairbo",
  description: "Pairboのプライバシーポリシー",
};

export default function PrivacyPolicyPage() {
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
          プライバシーポリシー
        </h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <p className="text-slate-600">
            Pairbo（以下「当サービス」）は、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              1. 収集する情報
            </h2>
            <p className="text-slate-600 mb-2">
              当サービスは、以下の情報を収集することがあります。
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>メールアドレス（アカウント認証のため）</li>
              <li>表示名（サービス内での識別のため）</li>
              <li>支出情報（金額、カテゴリ、日付、メモ）</li>
              <li>グループ情報（グループ名、メンバー構成）</li>
              <li>
                決済情報（Stripeを通じて処理、当サービスでは保存しません）
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              2. 情報の利用目的
            </h2>
            <p className="text-slate-600 mb-2">
              収集した情報は、以下の目的で利用します。
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>サービスの提供・運営</li>
              <li>ユーザー認証</li>
              <li>グループメンバー間での支出情報の共有</li>
              <li>精算金額の計算</li>
              <li>サービスの改善・新機能の開発</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              3. 第三者への提供
            </h2>
            <p className="text-slate-600 mb-2">
              当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              4. 外部サービスの利用
            </h2>
            <p className="text-slate-600 mb-2">
              当サービスは、以下の外部サービスを利用しています。
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-1">
              <li>
                <strong>Clerk</strong>：ユーザー認証（
                <a
                  href="https://clerk.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  プライバシーポリシー
                </a>
                ）
              </li>
              <li>
                <strong>Convex</strong>：データベース・バックエンド（
                <a
                  href="https://www.convex.dev/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  プライバシーポリシー
                </a>
                ）
              </li>
              <li>
                <strong>Stripe</strong>：決済処理（
                <a
                  href="https://stripe.com/jp/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  プライバシーポリシー
                </a>
                ）
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              5. データの保管
            </h2>
            <p className="text-slate-600">
              ユーザーのデータは、適切なセキュリティ対策を施したサーバーに保管されます。
              データは暗号化され、不正アクセスから保護されています。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              6. データの削除
            </h2>
            <p className="text-slate-600">
              ユーザーは、アカウントを削除することで、関連するデータの削除を要求できます。
              アカウント削除後、データは合理的な期間内に削除されます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              7. Cookieの使用
            </h2>
            <p className="text-slate-600">
              当サービスは、認証状態の維持やサービス改善のためにCookieを使用することがあります。
              ブラウザの設定でCookieを無効にすることができますが、一部の機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              8. プライバシーポリシーの変更
            </h2>
            <p className="text-slate-600">
              当サービスは、必要に応じてプライバシーポリシーを変更することがあります。
              重要な変更がある場合は、サービス内でお知らせします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              9. お問い合わせ
            </h2>
            <p className="text-slate-600">
              プライバシーポリシーに関するお問い合わせは、サービス内のお問い合わせ機能よりご連絡ください。
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

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-bold text-slate-300 mb-4">404</p>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          ページが見つかりません
        </h1>
        <p className="text-slate-500 mb-8">
          お探しのページは移動または削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}

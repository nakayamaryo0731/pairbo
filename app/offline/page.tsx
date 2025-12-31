import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <WifiOff className="h-16 w-16 text-slate-400 mb-6" />
      <h1 className="text-xl font-bold text-slate-900 mb-2">オフラインです</h1>
      <p className="text-slate-600 text-center max-w-sm">
        インターネット接続を確認してください。
        接続が回復すると自動的に更新されます。
      </p>
    </div>
  );
}

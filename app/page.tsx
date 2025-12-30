"use client";

import { UserButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 border-b border-slate-200 flex flex-row justify-between items-center shadow-sm">
        <h1 className="font-bold text-xl text-slate-800">Oaiko</h1>
        {isAuthenticated && <UserButton />}
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">おあいこ</h2>
          <p className="text-slate-600 mb-6">
            割り勘・傾斜折半ができる共有家計簿
          </p>

          {isAuthenticated ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ログイン済みです。機能は順次実装予定です。
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-slate-600">ログインしてください。</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

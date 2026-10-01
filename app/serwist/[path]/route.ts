import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

// オフラインページはビルド成果物のglobに含まれないため、コミットハッシュをrevisionにして明示的にprecacheする
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf-8",
  }).stdout?.trim() || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/offline", revision }],
    // 既定ではpublic/配下も全てprecacheされ、LP画像やstaging用アイコンまで全ユーザーが初回DLすることになるため、JS/CSSに限定する
    globPatterns: [".next/static/**/*.{js,css}"],
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
  });

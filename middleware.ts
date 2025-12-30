import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 公開ルート（認証不要）
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite/(.*)", // 招待リンク
]);

export default clerkMiddleware(async (auth, request) => {
  // 公開ルート以外は認証必須
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.js の内部ファイルと静的ファイルを除外
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // API routes
    "/(api|trpc)(.*)",
  ],
};

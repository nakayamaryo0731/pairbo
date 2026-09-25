"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    if (me && !me.isAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, me, router]);

  if (!isLoaded || !isSignedIn || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!me.isAdmin) {
    return null;
  }

  return <>{children}</>;
}

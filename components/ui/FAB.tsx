"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type FABProps = {
  href: string;
  icon: ReactNode;
  label: string;
};

export function FAB({ href, icon, label }: FABProps) {
  const { isAuthenticated } = useConvexAuth();
  const subscription = useQuery(
    api.subscriptions.getMySubscription,
    isAuthenticated ? {} : "skip",
  );

  const hasBanner = subscription?.plan !== "premium";
  const bottomValue = hasBanner
    ? "calc(9rem + env(safe-area-inset-bottom))"
    : "calc(5.5rem + env(safe-area-inset-bottom))";

  return (
    <Link
      href={href}
      className="fixed z-20 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center right-4"
      style={{ bottom: bottomValue }}
      aria-label={label}
    >
      <span className="[&>svg]:h-6 [&>svg]:w-6">{icon}</span>
    </Link>
  );
}

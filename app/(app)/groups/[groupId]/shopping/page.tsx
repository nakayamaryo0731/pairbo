"use client";

import { use } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import { ShoppingList } from "@/components/shopping";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function ShoppingListPage({ params }: PageProps) {
  const { groupId } = use(params);

  return <ShoppingList groupId={groupId as Id<"groups">} />;
}

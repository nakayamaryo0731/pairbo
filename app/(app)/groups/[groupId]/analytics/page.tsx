"use client";

import { use } from "react";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ groupId: string }>;
};

export default function AnalyticsRedirect({ params }: PageProps) {
  const { groupId } = use(params);
  redirect(`/groups/${groupId}`);
}

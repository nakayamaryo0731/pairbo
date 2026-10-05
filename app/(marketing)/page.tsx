import type { Metadata } from "next";
import { LandingPage } from "@/components/landing";

// canonicalはルートlayoutに置くと全ページが「正規URL=トップ」になり他ページがインデックスされないため、LPにだけ設定する
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <LandingPage />;
}

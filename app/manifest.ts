import type { MetadataRoute } from "next";
import { IS_STAGING } from "@/lib/appEnv";

const ICON_DIR = IS_STAGING ? "/icons/staging" : "/icons";
const ICON_SIZES = [
  "72x72",
  "96x96",
  "128x128",
  "144x144",
  "152x152",
  "192x192",
  "384x384",
  "512x512",
] as const;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: IS_STAGING ? "Pairbo STG" : "Pairbo - 2人のための共有家計簿",
    short_name: IS_STAGING ? "Pairbo STG" : "Pairbo",
    description: "割り勘・傾斜折半ができる共有家計簿アプリ",
    // ログイン済みユーザーがLPを経由せずアプリ本体へ直行できるようにする
    start_url: "/groups",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: IS_STAGING ? "#b05026" : "#3b82f6",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    prefer_related_applications: false,
    icons: [
      ...ICON_SIZES.map((sizes) => ({
        src: `${ICON_DIR}/icon-${sizes}.png`,
        sizes,
        type: "image/png",
      })),
      {
        src: `${ICON_DIR}/icon-maskable-512x512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

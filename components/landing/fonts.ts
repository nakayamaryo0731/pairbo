import { Zen_Kaku_Gothic_New, Zen_Maru_Gothic } from "next/font/google";

/**
 * LP専用フォント。アプリ本体には読み込まず、LandingPageのルートで
 * variableクラスを付与して使う（globals.cssの --font-maru / --font-kaku が参照）。
 */
export const zenMaru = Zen_Maru_Gothic({
  weight: ["700", "900"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-zen-maru",
});

export const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  preload: false,
  display: "swap",
  variable: "--font-zen-kaku",
});

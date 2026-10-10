import { isValidMemberColor } from "@/convex/domain/group";

/**
 * メンバーカラーの背景色 / 文字色ペア
 * - bg: カードや凡例の背景に使う淡い色（opacity-20で重ねる前提）
 * - text: 淡い背景の上で読める濃いめの同系色
 */
export const MEMBER_COLOR_PAIRS = [
  { bg: "#fca5a5", text: "#ef4444" }, // red    (red-300 / red-500)
  { bg: "#93c5fd", text: "#3b82f6" }, // blue   (blue-300 / blue-500)
  { bg: "#86efac", text: "#22c55e" }, // green  (green-300 / green-500)
  { bg: "#fcd34d", text: "#eab308" }, // yellow (amber-300 / yellow-500)
  { bg: "#c4b5fd", text: "#8b5cf6" }, // violet (violet-300 / violet-500)
  { bg: "#fdba74", text: "#f97316" }, // orange (orange-300 / orange-500)
  { bg: "#67e8f9", text: "#06b6d4" }, // cyan   (cyan-300 / cyan-500)
  { bg: "#f9a8d4", text: "#ec4899" }, // pink   (pink-300 / pink-500)
  { bg: "#a5b4fc", text: "#6366f1" }, // indigo (indigo-300 / indigo-500)
  { bg: "#a3e635", text: "#84cc16" }, // lime   (lime-400 / lime-500)
];

export const MEMBER_COLORS = MEMBER_COLOR_PAIRS.map((p) => p.bg);

const BG_TO_TEXT: Record<string, string> = Object.fromEntries(
  MEMBER_COLOR_PAIRS.map((p) => [p.bg.toLowerCase(), p.text]),
);

/**
 * メンバーのuserIdリスト（joinedAt順）からカラーマップを生成
 * - 保存色が `#RRGGBB` 形式でなければ既定色を使う（CSS 値に連結されるため）
 */
export function buildMemberColorMap(
  members: { userId: string; color?: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  members.forEach((m, i) => {
    map[m.userId] =
      m.color && isValidMemberColor(m.color)
        ? m.color
        : MEMBER_COLORS[i % MEMBER_COLORS.length];
  });
  return map;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "");
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

/**
 * 背景 HEX に対応する文字色を返す。
 * - 既定のメンバーカラー（MEMBER_COLOR_PAIRS）はペアテーブルから引く
 * - カスタムカラー（DBに保存された任意 hex）は HSL ベースで明度を下げる
 */
export function getMemberTextColor(bgHex: string): string {
  const paired = BG_TO_TEXT[bgHex.toLowerCase()];
  if (paired) return paired;
  const rgb = hexToRgb(bgHex);
  if (!rgb) return bgHex;
  const [h, s] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
  return `hsl(${h.toFixed(0)}, ${Math.min(100, s + 10).toFixed(0)}%, 30%)`;
}

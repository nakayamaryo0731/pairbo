export const MEMBER_COLORS = [
  "#fca5a5", // red
  "#93c5fd", // blue
  "#86efac", // green
  "#fcd34d", // yellow
  "#c4b5fd", // violet
  "#fdba74", // orange
  "#67e8f9", // cyan
  "#f9a8d4", // pink
  "#a5b4fc", // indigo
  "#a3e635", // lime
];

/**
 * メンバーのuserIdリスト（joinedAt順）からカラーマップを生成
 */
export function buildMemberColorMap(
  members: { userId: string; color?: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  members.forEach((m, i) => {
    map[m.userId] = m.color ?? MEMBER_COLORS[i % MEMBER_COLORS.length];
  });
  return map;
}

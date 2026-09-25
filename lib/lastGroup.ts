/**
 * 最後に開いたグループIDの永続化。
 * 起動時にサーバーへの問い合わせを待たず前回のグループへ即遷移するために使う。
 * 同一ブラウザでのアカウント切り替えで他人のグループへ遷移しないよう、
 * ClerkのユーザーIDと紐付けて保存する。
 * localStorageが使えない環境（プライベートモード等）では黙って無効化する。
 */
const KEY = "pairbo.lastGroup";

export function getLastGroupId(userId: string): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const stored: unknown = JSON.parse(raw);
    if (
      typeof stored === "object" &&
      stored !== null &&
      "userId" in stored &&
      "groupId" in stored &&
      stored.userId === userId &&
      typeof stored.groupId === "string"
    ) {
      return stored.groupId;
    }
    return null;
  } catch {
    return null;
  }
}

export function setLastGroupId(userId: string, groupId: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ userId, groupId }));
  } catch {
    // noop
  }
}

export function clearLastGroupId(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // noop
  }
}

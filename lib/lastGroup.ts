/**
 * 最後に開いたグループIDの永続化。
 * 起動時にサーバーへの問い合わせを待たず前回のグループへ即遷移するために使う。
 * localStorageが使えない環境（プライベートモード等）では黙って無効化する。
 */
const KEY = "pairbo.lastGroupId";

export function getLastGroupId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastGroupId(groupId: string): void {
  try {
    localStorage.setItem(KEY, groupId);
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

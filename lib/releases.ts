export type ReleaseAudience = "all" | "non-paying";

/** お知らせの CTA（取れるアクション）。今後増えたらここに追加する */
export type ReleaseCta = {
  /** ボタンに表示する文言 */
  label: string;
  /** クリック時の動作 */
  action: "claim_trial";
};

export type Release = {
  /** 一意なID（YYYY-MM-DD-slug 形式推奨） */
  id: string;
  /** 公開日時のタイムスタンプ（Date.UTC(...)で生成） */
  publishedAt: number;
  /** リリースタイトル */
  title: string;
  /** リリース本文（プレーンテキスト、改行で段落分け） */
  body: string;
  /**
   * 配信対象（省略時は "all"）。
   * "non-paying" を指定すると、Stripe で active / 期間内 canceled の課金中ユーザーには表示しない。
   */
  audience?: ReleaseAudience;
  /** お知らせ内の CTA（任意） */
  cta?: ReleaseCta;
  /** 表示の有効期限。これ以降は通知一覧から非表示にする（任意） */
  expiresAt?: number;
  /**
   * true の場合、認証済みユーザーが画面にアクセスした際に自動でモーダルを開く。
   * 既読（lastSeenReleaseAt が publishedAt 以上）になれば自動表示は止まる。
   */
  autoOpen?: boolean;
};

/**
 * リリースノート一覧
 *
 * 追加方法:
 * - 配列末尾に新しいエントリを追加
 * - publishedAt は `Date.UTC(year, monthIndex, day)` で生成（monthは0始まり）
 */
export const releases: Release[] = [
  {
    id: "2026-05-11-notifications",
    publishedAt: Date.UTC(2026, 4, 11),
    title: "新着情報のお知らせ機能を追加しました",
    body: "ヘッダーのベルアイコンから、Pairboの新機能や改善のお知らせが見られるようになりました。\n今後はアップデートのたびにこちらでお知らせします。",
  },
  {
    id: "2026-05-12-google-sheets-export",
    publishedAt: Date.UTC(2026, 4, 12),
    title: "Googleスプレッドシートへのエクスポートに対応しました（Premium）",
    body: "分析タブから、支出データをGoogleスプレッドシートに書き出せるようになりました。\n期間を選んでエクスポートすると、お使いのGoogleドライブに集計表が作成されます。",
  },
  {
    id: "2026-07-21-pair-plan",
    publishedAt: Date.UTC(2026, 6, 21),
    title: "Premiumがグループ全員で使えるようになりました",
    body: "グループ内のどちらか1人がPremiumなら、グループの全員が傾斜折半・タグ・年次分析などのPremium機能を使えるようになりました。\n1人分の課金で2人とも使えます。",
  },
  {
    id: "2026-09-16-recurring-expenses",
    publishedAt: Date.UTC(2026, 8, 16),
    title: "定期支出の自動記録ができるようになりました",
    body: "家賃やサブスクなど、毎月決まった支出を自動で記録できるようになりました。\n支出の記録画面で「毎月自動で記録」をONにするか、グループ設定の「定期支出」から登録すると、毎月決まった日に自動で記録されます。\nPremium機能です。グループのどちらか1人が加入していれば、2人とも使えます。",
    autoOpen: true,
  },
  {
    id: "2026-09-21-settlement-carryover",
    publishedAt: Date.UTC(2026, 8, 21),
    title: "精算の差額を翌月に繰り越せるようになりました",
    body: "精算画面の「翌月に繰り越す」を選ぶと、その月の差額を支払わずに翌月の精算へまとめられます。\n金額が小さい月や忙しい月は、無理に精算せずまとめて翌月に精算できます。",
    autoOpen: true,
  },
  {
    id: "2026-09-23-end-of-month-closing-day",
    publishedAt: Date.UTC(2026, 8, 23),
    title: "締め日に「末日」を選べるようになりました",
    body: "グループ設定の締め日で「末日」を選ぶと、月初から月末までを1つの精算期間にできます。\n2月やうるう年など月ごとの日数の違いにも自動で対応します。",
  },
  {
    id: "2026-09-22-new-icon",
    publishedAt: Date.UTC(2026, 8, 22),
    title: "Pairboのアイコンが新しくなりました",
    body: "ふたりを表す2つの円を重ねた、新しいアイコンとロゴに変わりました。\nホーム画面やブラウザタブでの見た目が変わりますが、アプリの機能や使い方に変更はありません。\n（iPhoneでホーム画面に追加している場合は、一度削除して追加し直すと新しいアイコンになります）",
    autoOpen: true,
  },
  {
    id: "2026-09-23-zero-amount-expense",
    publishedAt: Date.UTC(2026, 8, 23),
    title: "0円の支出を記録できるようになりました",
    body: "ポイントやクーポンで支払った分、出来事の備忘録など、実際の支払いがない記録を残せるようになりました。\n金額を0円にして登録すると、精算金額には影響しません。",
    autoOpen: true,
  },
];

/** リリース可視性判定で必要となる、ユーザーの支払い状況コンテキスト */
export type ReleaseAudienceContext = {
  plan: "free" | "premium" | null;
  status: "active" | "canceled" | "past_due" | "trialing" | null;
  currentPeriodEnd: number | null;
};

/** Stripe で課金中（active）または canceled だが期間内の Premium ユーザーかどうか */
function isPayingStripePremium(
  ctx: ReleaseAudienceContext,
  now: number = Date.now(),
): boolean {
  if (ctx.plan !== "premium") return false;
  if (ctx.status === "active") return true;
  if (
    ctx.status === "canceled" &&
    ctx.currentPeriodEnd != null &&
    ctx.currentPeriodEnd > now
  ) {
    return true;
  }
  return false;
}

/** 表示期限切れか */
export function isReleaseExpired(
  release: Release,
  now: number = Date.now(),
): boolean {
  return release.expiresAt != null && release.expiresAt <= now;
}

/** 個別リリースが特定ユーザーに見えるか判定する */
export function isReleaseVisibleTo(
  release: Release,
  ctx: ReleaseAudienceContext,
  now: number = Date.now(),
): boolean {
  if (isReleaseExpired(release, now)) return false;
  const audience = release.audience ?? "all";
  if (audience === "all") return true;
  if (audience === "non-paying") return !isPayingStripePremium(ctx, now);
  return true;
}

/** 公開日時の降順（新しい順）でリリースを取得 */
export function getReleasesDesc(): Release[] {
  return [...releases].sort((a, b) => b.publishedAt - a.publishedAt);
}

/** 支払い状況に応じて可視リリースを降順で取得 */
export function getVisibleReleasesDesc(
  ctx: ReleaseAudienceContext,
  now: number = Date.now(),
): Release[] {
  return getReleasesDesc().filter((r) => isReleaseVisibleTo(r, ctx, now));
}

/** 未読リリースがあるかどうか（リストを渡さない場合は全リリース対象） */
export function hasUnreadRelease(
  lastSeenAt: number | undefined,
  releasesList: Release[] = releases,
): boolean {
  const threshold = lastSeenAt ?? 0;
  return releasesList.some((r) => r.publishedAt > threshold);
}

/**
 * 自動でモーダルを開くべき release を返す（無ければ null）。
 *
 * 判定条件:
 * - autoOpen が true
 * - audience / 期限などの可視性を満たす（{@link isReleaseVisibleTo}）
 * - lastSeenReleaseAt より新しい（既読でない）
 * - claim_trial CTA の場合、trial を未 claim
 *
 * 条件を満たす中で最も新しい release を返す。
 */
export function getAutoOpenRelease(
  opts: {
    ctx: ReleaseAudienceContext;
    lastSeenReleaseAt: number | undefined;
    trialClaimed: boolean;
    now?: number;
  },
  releasesList: Release[] = releases,
): Release | null {
  const now = opts.now ?? Date.now();
  const threshold = opts.lastSeenReleaseAt ?? 0;
  const sorted = [...releasesList].sort(
    (a, b) => b.publishedAt - a.publishedAt,
  );
  return (
    sorted.find((r) => {
      if (r.autoOpen !== true) return false;
      if (!isReleaseVisibleTo(r, opts.ctx, now)) return false;
      if (r.publishedAt <= threshold) return false;
      if (r.cta?.action === "claim_trial" && opts.trialClaimed) return false;
      return true;
    }) ?? null
  );
}

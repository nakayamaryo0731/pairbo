import type Stripe from "stripe";

export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): "active" | "canceled" | "past_due" | "trialing" {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
    default:
      return "past_due";
  }
}

export type BillingInterval = "month" | "year";

/** Pairbo の Price は月額・年額のみ。それ以外の interval は未設定扱い */
export function mapBillingInterval(
  interval: Stripe.Price.Recurring.Interval | undefined,
): BillingInterval | undefined {
  if (interval === "month") return "month";
  if (interval === "year") return "year";
  return undefined;
}

const YEAR_THRESHOLD_MS = 100 * 24 * 60 * 60 * 1000;

/**
 * 表示用の課金間隔。billingInterval 導入前のレコードは期間長から推定する
 * （月額は 28〜31 日、年額は 365〜366 日）
 */
export function resolveBillingInterval(sub: {
  billingInterval?: BillingInterval;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
}): BillingInterval | null {
  if (sub.billingInterval) return sub.billingInterval;
  if (sub.currentPeriodStart == null || sub.currentPeriodEnd == null) {
    return null;
  }
  return sub.currentPeriodEnd - sub.currentPeriodStart > YEAR_THRESHOLD_MS
    ? "year"
    : "month";
}

import { describe, expect, test } from "vitest";
import {
  mapBillingInterval,
  mapSubscriptionStatus,
  resolveBillingInterval,
} from "../lib/stripeHelpers";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("mapBillingInterval", () => {
  test.each([
    { input: "month", expected: "month" },
    { input: "year", expected: "year" },
    { input: "week", expected: undefined },
    { input: "day", expected: undefined },
    { input: undefined, expected: undefined },
  ] as const)("$input → $expected", ({ input, expected }) => {
    expect(mapBillingInterval(input)).toBe(expected);
  });
});

describe("resolveBillingInterval", () => {
  const start = Date.UTC(2026, 0, 1);

  test("billingInterval があればそれを返す", () => {
    expect(
      resolveBillingInterval({
        billingInterval: "year",
        currentPeriodStart: start,
        currentPeriodEnd: start + 30 * DAY_MS,
      }),
    ).toBe("year");
  });

  test.each([
    { days: 28, expected: "month" },
    { days: 31, expected: "month" },
    { days: 365, expected: "year" },
    { days: 366, expected: "year" },
  ])("未設定なら期間 $days 日 → $expected", ({ days, expected }) => {
    expect(
      resolveBillingInterval({
        currentPeriodStart: start,
        currentPeriodEnd: start + days * DAY_MS,
      }),
    ).toBe(expected);
  });

  test("期間もなければ null", () => {
    expect(resolveBillingInterval({})).toBeNull();
    expect(resolveBillingInterval({ currentPeriodStart: start })).toBeNull();
  });
});

describe("mapSubscriptionStatus", () => {
  test.each([
    { input: "active", expected: "active" },
    { input: "canceled", expected: "canceled" },
    { input: "past_due", expected: "past_due" },
    { input: "trialing", expected: "trialing" },
    { input: "incomplete", expected: "past_due" },
    { input: "incomplete_expired", expected: "past_due" },
    { input: "unpaid", expected: "past_due" },
    { input: "paused", expected: "past_due" },
  ] as const)("$input → $expected", ({ input, expected }) => {
    expect(mapSubscriptionStatus(input)).toBe(expected);
  });
});

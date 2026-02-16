import { describe, expect, test } from "vitest";
import { mapSubscriptionStatus } from "../lib/stripeHelpers";

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

import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    CLERK_ISSUER_URL: v.string(),
    STRIPE_SECRET_KEY: v.string(),
    STRIPE_WEBHOOK_SECRET: v.string(),
    STRIPE_PRICE_MONTHLY: v.string(),
    STRIPE_PRICE_YEARLY: v.string(),
    GOOGLE_OAUTH_CLIENT_ID: v.string(),
    GOOGLE_OAUTH_CLIENT_SECRET: v.string(),
    GOOGLE_OAUTH_REDIRECT_URI: v.string(),
  },
});

export default app;

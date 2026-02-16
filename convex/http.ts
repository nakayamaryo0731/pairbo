import { httpRouter } from "convex/server";
import { httpAction, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";
import { Id } from "./_generated/dataModel";
import { mapSubscriptionStatus } from "./lib/stripeHelpers";
import { Logger } from "./lib/logger";

// Stripe Invoice の拡張型
type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string;
};

/** サブスクリプションから期間情報を取得（items.data[0] から取得） */
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    currentPeriodStart: item.current_period_start * 1000,
    currentPeriodEnd: item.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

const http = httpRouter();

// ========================================
// Stripe Webhook
// ========================================

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const logger = new Logger();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("SUBSCRIPTION", "webhook_secret_missing");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    // Stripe署名を検証
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    let event: Stripe.Event;
    const body = await request.text();

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      logger.error("SUBSCRIPTION", "webhook_signature_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Webhook signature verification failed", {
        status: 400,
      });
    }

    // イベント処理
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutSessionCompleted(ctx, session);
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(ctx, subscription);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(ctx, subscription);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(ctx, invoice);
          break;
        }

        default:
          logger.debug("SUBSCRIPTION", "webhook_unhandled_event", {
            eventType: event.type,
          });
      }
    } catch (err) {
      logger.error("SUBSCRIPTION", "webhook_processing_failed", {
        eventType: event.type,
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Webhook processing failed", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  }),
});

// ========================================
// Webhookハンドラー
// ========================================

async function handleCheckoutSessionCompleted(
  ctx: ActionCtx,
  session: Stripe.Checkout.Session,
) {
  const logger = new Logger();
  const userId = session.metadata?.userId;
  if (!userId) {
    logger.error("SUBSCRIPTION", "checkout_missing_user_id");
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // サブスクリプション詳細を取得
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const period = getSubscriptionPeriod(subscription);

  await ctx.runMutation(internal.subscriptions.upsertSubscription, {
    userId: userId as Id<"users">,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscriptionId,
    plan: "premium" as const,
    status: mapSubscriptionStatus(subscription.status),
    ...period,
  });

  logger.audit("SUBSCRIPTION", "created", { userId });
}

async function handleSubscriptionUpdated(
  ctx: ActionCtx,
  subscription: Stripe.Subscription,
) {
  const logger = new Logger();
  const period = getSubscriptionPeriod(subscription);

  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    stripeSubscriptionId: subscription.id,
    status: mapSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: period.cancelAtPeriodEnd,
    currentPeriodEnd: period.currentPeriodEnd,
  });

  logger.audit("SUBSCRIPTION", "updated", {
    stripeSubscriptionId: subscription.id,
  });
}

async function handleSubscriptionDeleted(
  ctx: ActionCtx,
  subscription: Stripe.Subscription,
) {
  const logger = new Logger();
  await ctx.runMutation(internal.subscriptions.deleteSubscription, {
    stripeSubscriptionId: subscription.id,
  });

  logger.audit("SUBSCRIPTION", "deleted", {
    stripeSubscriptionId: subscription.id,
  });
}

async function handlePaymentFailed(ctx: ActionCtx, invoice: Stripe.Invoice) {
  const logger = new Logger();
  const inv = invoice as StripeInvoiceWithSubscription;
  const subscriptionId = inv.subscription;
  if (!subscriptionId) return;

  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    stripeSubscriptionId: subscriptionId,
    status: "past_due" as const,
  });

  logger.warn("SUBSCRIPTION", "payment_failed", {
    stripeSubscriptionId: subscriptionId,
  });
}

// ========================================
// ヘルパー関数
// ========================================

export default http;

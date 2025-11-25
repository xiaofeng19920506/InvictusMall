import { Request, Response } from "express";
import Stripe from "stripe";
import { OrderModel } from "../../models/OrderModel";
import { StaffModel } from "../../models/StaffModel";
import { ApiResponseHelper } from "../../utils/apiResponse";
import { logger } from "../../utils/logger";
import { AuthenticatedRequest } from "../../middleware/auth";

// Helper function to get storeId from a Stripe charge
async function getStoreIdFromCharge(
  charge: Stripe.Charge,
  orderModel: OrderModel,
  stripeClient: Stripe | null
): Promise<string | null> {
  try {
    // First, try to get storeId from charge metadata
    if (charge.metadata?.storeId) {
      return charge.metadata.storeId;
    }

    // If charge has a payment_intent, try to get storeId from payment intent
    if (charge.payment_intent) {
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;

      try {
        // First, try to find orders directly by payment_intent_id
        const orders = await orderModel.getOrdersByPaymentIntentId(paymentIntentId);
        if (orders.length > 0 && orders[0]) {
          return orders[0].storeId;
        }

        if (!stripeClient) return null;

        // Fallback: try to get from payment intent metadata
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

        // Check payment intent metadata for storeId
        if (paymentIntent.metadata?.storeId) {
          return paymentIntent.metadata.storeId;
        }

        // Fallback: try to get session ID from payment intent metadata
        let sessionId = paymentIntent.metadata?.sessionId || paymentIntent.metadata?.checkout_session_id;

        // If no session ID in metadata, try to find it by listing checkout sessions
        if (!sessionId && stripeClient) {
          try {
            const sessions = await stripeClient.checkout.sessions.list({
              payment_intent: paymentIntentId,
              limit: 1,
            });
            if (sessions.data.length > 0 && sessions.data[0]) {
              sessionId = sessions.data[0].id;
            }
          } catch (sessionError) {
            logger.error("Error looking up checkout session", sessionError, { paymentIntentId });
          }
        }

        if (sessionId) {
          const sessionOrders = await orderModel.getOrdersByStripeSession(sessionId);
          if (sessionOrders.length > 0 && sessionOrders[0]) {
            return sessionOrders[0].storeId;
          }
        }
      } catch (piError) {
        logger.error("Error retrieving payment intent", piError, { chargeId: charge.id });
      }
    }

    return null;
  } catch (error) {
    logger.error("Error getting storeId from charge", error, { chargeId: charge.id });
    return null;
  }
}

export async function handleGetStripeTransactions(
  req: AuthenticatedRequest,
  res: Response,
  orderModel: OrderModel,
  stripeClient: Stripe | null
): Promise<void> {
  try {
    if (!stripeClient) {
      ApiResponseHelper.error(
        res,
        "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.",
        503
      );
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = (req.query.type as string) || "charge";
    const startingAfter = req.query.starting_after as string | undefined;

    // Role-based filtering: Non-admin users can only see their store's transactions
    let userStoreId: string | null = null;
    if (req.user && req.user.role !== "admin") {
      const staffModel = new StaffModel();
      const staff = await staffModel.getStaffById(req.user.id);
      if (staff && (staff as any).storeId) {
        userStoreId = (staff as any).storeId;
      }
    }

    let transactions: any[] = [];

    try {
      if (type === "charge") {
        // Get charges
        const charges = await stripeClient.charges.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // Process charges and add storeId
        const chargePromises = charges.data.map(async (charge: Stripe.Charge) => {
          const storeId = await getStoreIdFromCharge(charge, orderModel, stripeClient);

          // Filter by user's store if not admin
          if (userStoreId && storeId !== userStoreId) {
            return null;
          }

          return {
            id: charge.id,
            stripeType: "charge",
            storeId: storeId || null,
            amount: charge.amount / 100,
            currency: charge.currency.toUpperCase(),
            status:
              charge.status === "succeeded"
                ? "completed"
                : charge.status === "pending"
                  ? "pending"
                  : charge.status === "failed"
                    ? "failed"
                    : "cancelled",
            description: charge.description || `Charge for ${charge.customer || "customer"}`,
            customerId: charge.customer || undefined,
            customerName: charge.billing_details?.name || undefined,
            paymentMethod:
              charge.payment_method_details?.type ||
              (charge.payment_method_details?.card ? "card" : "unknown"),
            transactionDate: new Date(charge.created * 1000).toISOString(),
            metadata: {
              stripeChargeId: charge.id,
              receiptUrl: charge.receipt_url,
              receiptNumber: charge.receipt_number,
              refunded: charge.refunded,
              amountRefunded: charge.amount_refunded ? charge.amount_refunded / 100 : 0,
              outcome: charge.outcome,
              source: charge.source,
            },
            createdAt: new Date(charge.created * 1000).toISOString(),
            updatedAt: new Date(charge.created * 1000).toISOString(),
          };
        });

        const chargeResults = await Promise.all(chargePromises);
        transactions = chargeResults.filter((t) => t !== null) as any[];
      } else if (type === "balance_transaction") {
        // Get balance transactions
        const balanceTransactions = await stripeClient.balanceTransactions.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // For balance transactions, try to get storeId from the source
        const balanceTransactionPromises = balanceTransactions.data.map(
          async (bt: Stripe.BalanceTransaction) => {
            let storeId: string | null = null;

            // Try to get storeId from the source
            if (bt.source) {
              const sourceId = typeof bt.source === "string" ? bt.source : bt.source.id;
              const sourceType = typeof bt.source === "string" ? "unknown" : bt.source.object;

              if (sourceType === "charge") {
                try {
                  const charge = await stripeClient!.charges.retrieve(sourceId);
                  storeId = await getStoreIdFromCharge(charge, orderModel, stripeClient);
                } catch (error) {
                  logger.error("Error retrieving charge for balance transaction", error, {
                    balanceTransactionId: bt.id,
                  });
                }
              } else if (typeof sourceId === "string" && sourceId.startsWith("pi_")) {
                // Payment intent IDs start with 'pi_'
                try {
                  const paymentIntent = await stripeClient!.paymentIntents.retrieve(sourceId);
                  if (paymentIntent.metadata?.storeId) {
                    storeId = paymentIntent.metadata.storeId;
                  } else {
                    const sessionId =
                      paymentIntent.metadata?.sessionId ||
                      paymentIntent.metadata?.checkout_session_id;
                    if (sessionId) {
                      const orders = await orderModel.getOrdersByStripeSession(sessionId);
                      if (orders.length > 0 && orders[0]) {
                        storeId = orders[0].storeId;
                      }
                    }
                  }
                } catch (error) {
                  logger.error("Error retrieving payment intent for balance transaction", error, {
                    balanceTransactionId: bt.id,
                  });
                }
              }
            }

            // Filter by user's store if not admin
            if (userStoreId && storeId !== userStoreId) {
              return null;
            }

            return {
              id: bt.id,
              stripeType: "balance_transaction",
              storeId: storeId || null,
              amount: Math.abs(bt.amount) / 100,
              currency: bt.currency.toUpperCase(),
              status:
                bt.status === "available" || bt.status === "pending"
                  ? bt.status === "available"
                    ? "completed"
                    : "pending"
                  : "failed",
              description: bt.description || `Balance transaction: ${bt.type}`,
              transactionType: bt.type.includes("refund")
                ? "refund"
                : bt.type.includes("charge")
                  ? "sale"
                  : bt.type.includes("payment")
                    ? "payment"
                    : "fee",
              transactionDate: new Date(bt.created * 1000).toISOString(),
              metadata: {
                stripeBalanceTransactionId: bt.id,
                type: bt.type,
                net: bt.net ? bt.net / 100 : 0,
                fee: bt.fee ? bt.fee / 100 : 0,
                source: bt.source,
              },
              createdAt: new Date(bt.created * 1000).toISOString(),
              updatedAt: new Date(bt.created * 1000).toISOString(),
            };
          }
        );

        const balanceResults = await Promise.all(balanceTransactionPromises);
        transactions = balanceResults.filter((t) => t !== null) as any[];
      } else if (type === "payment_intent") {
        // Get payment intents
        const paymentIntents = await stripeClient.paymentIntents.list({
          limit: Math.min(limit, 100),
          starting_after: startingAfter,
        });

        // Process payment intents and add storeId
        const paymentIntentPromises = paymentIntents.data.map(async (pi: Stripe.PaymentIntent) => {
          // Expand charges if available
          const chargeIds: string[] = [];
          if (pi.latest_charge) {
            chargeIds.push(
              typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id
            );
          }

          // Get storeId from payment intent metadata or by looking up orders
          let storeId: string | null = null;
          if (pi.metadata?.storeId) {
            storeId = pi.metadata.storeId;
          } else {
            // Try to find orders by payment_intent_id directly
            try {
              const orders = await orderModel.getOrdersByPaymentIntentId(pi.id);
              if (orders.length > 0 && orders[0]) {
                storeId = orders[0].storeId;
              }
            } catch (error) {
              logger.error("Error getting orders by payment intent ID", error, {
                paymentIntentId: pi.id,
              });
              // Fallback: try to find via checkout session
              let sessionId = pi.metadata?.sessionId || pi.metadata?.checkout_session_id;
              if (!sessionId && stripeClient) {
                try {
                  const sessions = await stripeClient.checkout.sessions.list({
                    payment_intent: pi.id,
                    limit: 1,
                  });
                  if (sessions.data.length > 0 && sessions.data[0]) {
                    sessionId = sessions.data[0].id;
                  }
                } catch (sessionError) {
                  logger.error("Error looking up checkout session for payment intent", sessionError, {
                    paymentIntentId: pi.id,
                  });
                }
              }
              if (sessionId) {
                try {
                  const orders = await orderModel.getOrdersByStripeSession(sessionId);
                  if (orders.length > 0 && orders[0]) {
                    storeId = orders[0].storeId;
                  }
                } catch (sessionError) {
                  logger.error("Error getting orders by session", sessionError, { sessionId });
                }
              }
            }
          }

          // Filter by user's store if not admin
          if (userStoreId && storeId !== userStoreId) {
            return null;
          }

          // Map Stripe Payment Intent status to our transaction status
          let transactionStatus: "pending" | "completed" | "failed" | "cancelled";
          if (pi.status === "succeeded") {
            transactionStatus = "completed";
          } else if (pi.status === "canceled") {
            transactionStatus = "cancelled";
          } else if (
            pi.status === "processing" ||
            pi.status === "requires_confirmation" ||
            pi.status === "requires_payment_method" ||
            pi.status === "requires_action" ||
            pi.status === "requires_capture"
          ) {
            transactionStatus = "pending";
          } else {
            transactionStatus = "pending";
          }

          return {
            id: pi.id,
            stripeType: "payment_intent",
            storeId: storeId || null,
            amount: pi.amount / 100,
            currency: pi.currency.toUpperCase(),
            status: transactionStatus,
            description: pi.description || `Payment intent: ${pi.id}`,
            customerId: pi.customer || undefined,
            paymentMethod: pi.payment_method_types[0] || "unknown",
            transactionDate: new Date(pi.created * 1000).toISOString(),
            metadata: {
              stripePaymentIntentId: pi.id,
              clientSecret: pi.client_secret,
              charges: chargeIds,
              originalStatus: pi.status,
            },
            createdAt: new Date(pi.created * 1000).toISOString(),
            updatedAt: new Date(pi.created * 1000).toISOString(),
          };
        });

        const paymentIntentResults = await Promise.all(paymentIntentPromises);
        transactions = paymentIntentResults.filter((t) => t !== null) as any[];
      }

      res.status(200).json({
        success: true,
        data: transactions,
        count: transactions.length,
        hasMore: transactions.length === limit,
        lastId: transactions.length > 0 ? transactions[transactions.length - 1].id : undefined,
      });
    } catch (stripeError: any) {
      logger.error("Stripe API error", stripeError, { userId: req.user?.id });
      ApiResponseHelper.error(res, "Failed to fetch Stripe transactions", 500, stripeError);
    }
  } catch (error) {
    logger.error("Error fetching Stripe transactions", error, { userId: req.user?.id });
    ApiResponseHelper.error(res, "Failed to fetch Stripe transactions", 500, error);
  }
}


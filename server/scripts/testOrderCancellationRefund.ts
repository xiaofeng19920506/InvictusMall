/**
 * Test script for order cancellation and automatic refund
 *
 * This script:
 * 1. Reads existing products and stores from database
 * 2. Creates a test order with Stripe test payment (using 4242 card)
 * 3. Cancels the order
 * 4. Verifies that all amounts are refunded
 *
 * Usage: npx ts-node server/scripts/testOrderCancellationRefund.ts
 */

import mysql from "mysql2/promise";
import Stripe from "stripe";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";
import { dbConfig } from "../src/config/database";
import { OrderModel } from "../src/models/OrderModel";
import { RefundModel } from "../src/models/RefundModel";
import { ProductModel } from "../src/models/ProductModel";
import { StoreModel } from "../src/models/StoreModel";
import { UserModel } from "../src/models/UserModel";

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("❌ STRIPE_SECRET_KEY is not set in environment variables");
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-02-24.acacia",
});

async function testOrderCancellationRefund() {
  let connection;
  const orderModel = new OrderModel();
  const refundModel = new RefundModel();

  try {
    console.log("🔌 Connecting to database...");
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    console.log("✅ Connected to database\n");

    // Step 1: Get a store
    console.log("📦 Step 1: Finding a store...");
    const stores = await StoreModel.findAll();
    if (stores.length === 0) {
      throw new Error(
        "No stores found in database. Please create a store first."
      );
    }
    const store = stores[0];
    if (!store) {
      throw new Error("Store not found");
    }
    console.log(`✅ Found store: ${store.name} (ID: ${store.id})\n`);

    // Step 2: Get a product from the store
    console.log("🛍️  Step 2: Finding a product...");
    const products = await ProductModel.findByStoreId(store.id, {
      isActive: true,
    });
    if (products.length === 0) {
      throw new Error(
        `No active products found for store "${store.name}". Please create a product first.`
      );
    }
    const product = products[0];
    if (!product) {
      throw new Error("Product not found");
    }
    console.log(
      `✅ Found product: ${product.name} (Price: $${product.price}, Stock: ${product.stockQuantity})\n`
    );

    // Step 3: Get or create a test user
    console.log("👤 Step 3: Getting or creating test user...");
    const userModel = new UserModel();

    // Try to find existing user
    let testUser = await userModel.getUserByEmail("test@example.com");

    if (!testUser) {
      // Check if user exists in database directly
      const [users] = (await connection.execute(
        "SELECT * FROM users WHERE email = ?",
        ["test@example.com"]
      )) as any[];

      if (users && users.length > 0) {
        // User exists but getUserByEmail returned null (maybe inactive)
        // Use the first user from database
        testUser = {
          id: users[0].id,
          email: users[0].email,
          firstName: users[0].first_name,
          lastName: users[0].last_name,
          phoneNumber: users[0].phone_number,
          role: users[0].role,
          isActive: Boolean(users[0].is_active),
          emailVerified: Boolean(users[0].email_verified),
          createdAt:
            users[0].created_at?.toISOString() || new Date().toISOString(),
          updatedAt:
            users[0].updated_at?.toISOString() || new Date().toISOString(),
        };
        console.log(
          `✅ Found existing test user in database: ${testUser.email} (ID: ${testUser.id})\n`
        );
      } else {
        // Create test user if not exists
        console.log("Creating new test user...");
        testUser = await userModel.createUser({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          phoneNumber: "+1234567890",
        });
        console.log(
          `✅ Created test user: ${testUser.email} (ID: ${testUser.id})\n`
        );
      }
    } else {
      console.log(
        `✅ Found existing test user: ${testUser.email} (ID: ${testUser.id})\n`
      );
    }

    if (!testUser || !testUser.id) {
      throw new Error("Test user is required");
    }

    // Step 4: Create Stripe Payment Intent
    console.log("💳 Step 4: Creating Stripe Payment Intent...");
    const orderAmount = product.price * 2; // Order 2 items
    const amountInCents = Math.round(orderAmount * 100);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        orderId: "test-order-pending",
        testOrder: "true",
      },
    });
    console.log(
      `✅ Created Payment Intent: ${paymentIntent.id} (Amount: $${orderAmount})\n`
    );

    // Step 5: Create a test charge to simulate successful payment
    // In Stripe test mode, we can create a charge directly
    console.log("💳 Step 5: Creating test charge to simulate payment...");
    console.log(`   Payment Intent ID: ${paymentIntent.id}\n`);

    let testChargeId: string | null = null;
    let confirmedPaymentIntent;

    try {
      // Create a test charge using Stripe test token
      // Note: This requires Stripe test mode and proper API permissions
      console.log(
        "   Creating test charge with test card (4242 4242 4242 4242)..."
      );

      const testCharge = await stripe.charges.create({
        amount: amountInCents,
        currency: "usd",
        source: "tok_visa", // Stripe test token
        description: `Test charge for payment intent ${paymentIntent.id}`,
        metadata: {
          paymentIntentId: paymentIntent.id,
          testOrder: "true",
          orderId: "test-order-pending",
        },
      } as any);

      testChargeId = testCharge.id;
      console.log(`   ✅ Test charge created: ${testChargeId}`);
      console.log(`   Charge status: ${testCharge.status}\n`);

      // Retrieve payment intent
      confirmedPaymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntent.id
      );
    } catch (chargeError: any) {
      console.log(
        `   ⚠️  Could not create test charge: ${chargeError.message}`
      );
      console.log("   This is expected if Stripe test mode has restrictions.");
      console.log(
        "   The refund test will proceed, but may not find a successful charge.\n"
      );

      // Try to retrieve payment intent
      try {
        confirmedPaymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntent.id
        );
      } catch (error) {
        confirmedPaymentIntent = paymentIntent;
      }
    }

    // Step 6: Create order
    console.log("📝 Step 6: Creating order...");
    const order = await orderModel.createOrder({
      userId: testUser.id,
      storeId: store.id,
      storeName: store.name,
      items: [
        {
          productId: product.id,
          productName: product.name,
          productImage: product.imageUrl,
          quantity: 2,
          price: product.price,
        },
      ],
      shippingAddress: {
        streetAddress: "123 Test Street",
        aptNumber: "Apt 4B",
        city: "Test City",
        stateProvince: "CA",
        zipCode: "12345",
        country: "USA",
      },
      paymentMethod: `stripe_payment_intent:${paymentIntent.id}`,
      paymentIntentId: paymentIntent.id,
      status: "pending",
    });

    // Update order with payment intent
    await orderModel.updateOrderAfterPayment(order.id, {
      paymentIntentId: paymentIntent.id,
      status: "processing",
    });

    const updatedOrder = await orderModel.getOrderById(order.id);
    console.log(`✅ Order created: ${order.id}`);
    console.log(`   Total Amount: $${updatedOrder.totalAmount}`);
    console.log(`   Status: ${updatedOrder.status}`);
    console.log(`   Payment Intent: ${updatedOrder.paymentIntentId}\n`);

    // Step 7: Cancel the order
    console.log("❌ Step 7: Cancelling order...");
    await orderModel.updateOrderStatus(order.id, "cancelled");

    // Step 8: Manually trigger refund (simulating the admin route logic)
    console.log("💰 Step 8: Processing automatic refund...");
    const totalRefunded = await refundModel.getTotalRefundedAmount(order.id);
    const remainingAmount = updatedOrder.totalAmount - totalRefunded;

    if (remainingAmount > 0.01) {
      // Get payment intent
      const pi = await stripe.paymentIntents.retrieve(paymentIntent.id);
      console.log(`   Payment Intent Status: ${pi.status}`);
      console.log(`   Test Charge ID: ${testChargeId || "N/A"}\n`);

      // Try to find a successful charge
      // First, use the test charge we created
      let chargeId: string | null = testChargeId || null;

      // Verify the test charge is valid
      if (chargeId) {
        try {
          const charge = await stripe.charges.retrieve(chargeId);
          if (charge.status !== "succeeded") {
            console.log(
              `   ⚠️  Test charge status is ${charge.status}, looking for other charges...`
            );
            chargeId = null;
          }
        } catch (error) {
          console.log(
            `   ⚠️  Could not retrieve test charge, looking for other charges...`
          );
          chargeId = null;
        }
      }

      // If payment intent is succeeded, try to find charge from payment intent
      if (!chargeId && pi.status === "succeeded") {
        if (pi.latest_charge) {
          const latestChargeId =
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : pi.latest_charge.id;

          try {
            const charge = await stripe.charges.retrieve(latestChargeId);
            if (charge.status === "succeeded") {
              chargeId = charge.id;
            }
          } catch (chargeError) {
            // Ignore
          }
        }

        if (!chargeId) {
          // Try to list charges for this payment intent
          const charges = await stripe.charges.list({
            payment_intent: paymentIntent.id,
            limit: 10,
          });

          const succeededCharge = charges.data.find(
            (c) => c.status === "succeeded"
          );
          if (succeededCharge) {
            chargeId = succeededCharge.id;
          }
        }
      }

      // Also search for charges by metadata (our test charge)
      if (!chargeId && testChargeId) {
        try {
          const charge = await stripe.charges.retrieve(testChargeId);
          if (charge.status === "succeeded") {
            chargeId = charge.id;
            console.log(`   ✅ Found test charge: ${chargeId}\n`);
          }
        } catch (error) {
          // Ignore
        }
      }

      if (chargeId) {
        // Create refund
        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: Math.round(remainingAmount * 100),
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id,
            autoRefund: "true",
            reason: "Order cancelled - test",
          },
        });

        console.log(`✅ Refund created in Stripe: ${refund.id}`);
        console.log(`   Refund Amount: $${remainingAmount}`);
        console.log(`   Refund Status: ${refund.status}\n`);

        // Save refund record
        await refundModel.create({
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          refundId: refund.id,
          amount: remainingAmount,
          currency: "usd",
          reason: "Order cancelled - automatic full refund (test)",
          status: refund.status || "succeeded",
          refundedBy: testUser.id,
        });

        console.log("✅ Refund record saved to database\n");
      } else {
        console.log("   ⚠️  No successful charge found for refund");
        console.log("   This may be because payment was not confirmed.");
        if (pi.status !== "succeeded") {
          console.log(`   Payment Intent Status: ${pi.status}\n`);
        } else {
          console.log("\n");
        }
      }
    } else {
      console.log(
        "   ✅ Order already fully refunded or no amount to refund\n"
      );
    }

    // Step 9: Verify refund
    console.log("✅ Step 9: Verifying refund...");
    const finalOrder = await orderModel.getOrderById(order.id);
    const refunds = await refundModel.findByOrderId(order.id);
    const totalRefundedFinal = await refundModel.getTotalRefundedAmount(
      order.id
    );

    console.log("\n📊 Test Results:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Order ID: ${finalOrder.id}`);
    console.log(`Order Status: ${finalOrder.status}`);
    console.log(`Order Total Amount: $${finalOrder.totalAmount}`);
    console.log(`Total Refunded: $${totalRefundedFinal}`);
    console.log(
      `Remaining Amount: $${(
        finalOrder.totalAmount - totalRefundedFinal
      ).toFixed(2)}`
    );
    console.log(`Number of Refunds: ${refunds.length}`);

    if (refunds.length > 0) {
      console.log("\nRefund Details:");
      refunds.forEach((refund, index) => {
        console.log(`  Refund ${index + 1}:`);
        console.log(`    ID: ${refund.id}`);
        console.log(`    Stripe Refund ID: ${refund.refundId}`);
        console.log(`    Amount: $${refund.amount}`);
        console.log(`    Status: ${refund.status}`);
        console.log(`    Reason: ${refund.reason || "N/A"}`);
      });
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verify test passed
    const isFullyRefunded =
      Math.abs(finalOrder.totalAmount - totalRefundedFinal) < 0.01;
    const hasRefund = refunds.length > 0;
    const orderIsCancelled = finalOrder.status === "cancelled";

    if (isFullyRefunded && hasRefund && orderIsCancelled) {
      console.log("🎉 TEST PASSED! ✅");
      console.log("   ✓ Order is cancelled");
      console.log("   ✓ Refund was created");
      console.log("   ✓ Full amount was refunded");
      return true;
    } else {
      console.log("❌ TEST FAILED!");
      if (!orderIsCancelled) {
        console.log("   ✗ Order is not cancelled");
      }
      if (!hasRefund) {
        console.log("   ✗ No refund was created");
      }
      if (!isFullyRefunded) {
        console.log(
          `   ✗ Amount not fully refunded (remaining: $${(
            finalOrder.totalAmount - totalRefundedFinal
          ).toFixed(2)})`
        );
      }
      return false;
    }
  } catch (error: any) {
    console.error("\n❌ Test failed with error:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Database connection closed");
    }
  }
}

// Run the test
testOrderCancellationRefund()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

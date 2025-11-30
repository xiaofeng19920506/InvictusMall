import mysql from "mysql2/promise";
import Stripe from "stripe";
import dotenv from "dotenv";
import { dbConfig } from "../src/config/database";
import { OrderModel } from "../src/models/OrderModel";
import { RefundModel } from "../src/models/RefundModel";
import { ProductModel } from "../src/models/ProductModel";
import { StoreModel } from "../src/models/StoreModel";
import { UserModel, User } from "../src/models/UserModel";

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

async function testOrderReturnRefund() {
  let connection: mysql.Connection | null = null;
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

    let testUser: User | null = null;

    // Try to find existing user directly from the database
    const [users] = (await connection.execute(
      "SELECT id, email, first_name, last_name, phone_number, role, is_active, email_verified, created_at, updated_at FROM users WHERE email = ?",
      ["test@example.com"]
    )) as any[];

    if (users && users.length > 0) {
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
        orderId: "test-order-return-pending",
        testUser: testUser.id,
        testOrder: "true",
      },
    });
    console.log(
      `✅ Created Payment Intent: ${paymentIntent.id} (Amount: $${orderAmount})\n`
    );

    // Step 5: Create a test charge to simulate successful payment
    console.log("💳 Step 5: Creating test charge to simulate payment...");
    console.log(`   Payment Intent ID: ${paymentIntent.id}\n`);

    let testChargeId: string | null = null;

    try {
      console.log(
        "   Creating test charge with test card (4242 4242 4242 4242)..."
      );

      // First, create a payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      // Attach payment method to payment intent
      await stripe.paymentIntents.update(paymentIntent.id, {
        payment_method: paymentMethod.id,
      });

      // Confirm the payment intent
      const confirmedPI = await stripe.paymentIntents.confirm(paymentIntent.id);
      console.log(`   ✅ Payment Intent confirmed: ${confirmedPI.status}`);
      
      if (confirmedPI.latest_charge) {
        testChargeId = typeof confirmedPI.latest_charge === 'string' 
          ? confirmedPI.latest_charge 
          : confirmedPI.latest_charge.id;
        console.log(`   ✅ Test charge created: ${testChargeId}\n`);
      } else {
        console.log(`   ⚠️  Payment Intent confirmed but no charge found\n`);
      }
    } catch (chargeError: any) {
      console.log(
        `   ⚠️  Could not create test charge or confirm payment: ${chargeError.message}`
      );
      console.log("   Trying alternative method...\n");
      
      // Alternative: Try to create charge directly
      try {
        const testCharge = await stripe.charges.create({
          amount: amountInCents,
          currency: "usd",
          source: "tok_visa",
          description: `Test charge for payment intent ${paymentIntent.id}`,
          metadata: {
            paymentIntentId: paymentIntent.id,
            testOrder: "true",
            orderId: "test-order-return-pending",
          },
        });
        testChargeId = testCharge.id;
        console.log(`   ✅ Test charge created (alternative method): ${testChargeId}\n`);
      } catch (altError: any) {
        console.log(`   ⚠️  Alternative method also failed: ${altError.message}\n`);
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

    // Step 7: Simulate order delivery (shipped -> delivered)
    console.log("📦 Step 7: Simulating order delivery...");
    await orderModel.updateOrderStatus(order.id, "shipped");
    await orderModel.updateOrderStatus(order.id, "delivered");
    const deliveredOrder = await orderModel.getOrderById(order.id);
    console.log(`✅ Order delivered: ${deliveredOrder.status}\n`);

    // Step 8: User requests return (status -> return_processing)
    console.log("🔄 Step 8: User requests return (status -> return_processing)...");
    await orderModel.updateOrderStatus(order.id, "return_processing");
    const returnProcessingOrder = await orderModel.getOrderById(order.id);
    console.log(`✅ Order status changed to: ${returnProcessingOrder.status}\n`);

    // Step 9: Admin confirms receipt of returned items (status -> returned)
    // This should trigger automatic refund
    console.log("✅ Step 9: Admin confirms receipt (status -> returned)...");
    console.log("   This should trigger automatic refund...\n");
    
    // Update status to returned (this simulates admin action)
    await orderModel.updateOrderStatus(order.id, "returned");
    
    // Step 10: Process automatic refund (simulating the admin route logic)
    // This is what happens in adminOrderRoutes.ts when status changes to 'returned'
    console.log("💰 Step 10: Processing automatic refund (simulating admin route)...");
    // Get the current order state after status update
    const returnedOrder = await orderModel.getOrderById(order.id);
    const totalRefunded = await refundModel.getTotalRefundedAmount(order.id);
    const remainingAmount = returnedOrder.totalAmount - totalRefunded;

    if (remainingAmount > 0.01 && returnedOrder.paymentIntentId) {
      // Get payment intent
      const pi = await stripe.paymentIntents.retrieve(returnedOrder.paymentIntentId);
      console.log(`   Payment Intent Status: ${pi.status}`);
      console.log(`   Test Charge ID: ${testChargeId || "N/A"}\n`);

      // Try to find a successful charge
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
            payment_intent: returnedOrder.paymentIntentId,
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
            reason: "Order returned - test",
          },
        });

        console.log(`✅ Refund created in Stripe: ${refund.id}`);
        console.log(`   Refund Amount: $${remainingAmount}`);
        console.log(`   Refund Status: ${refund.status}\n`);

        // Save refund record
        await refundModel.create({
          orderId: order.id,
          paymentIntentId: returnedOrder.paymentIntentId!,
          refundId: refund.id,
          amount: remainingAmount,
          currency: "usd",
          reason: "Order returned - automatic full refund (test)",
          status: refund.status || "succeeded",
          refundedBy: testUser.id,
        });

        console.log("✅ Refund record saved to database\n");
      } else {
        console.log("   ⚠️  No successful charge found for refund");
        console.log("   This may be because payment was not confirmed.\n");
      }
    } else {
      console.log(
        "   ✅ Order already fully refunded or no amount to refund\n"
      );
    }

    // Step 11: Verify refund
    console.log("✅ Step 11: Verifying refund...");
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
    const orderIsReturned = finalOrder.status === "returned";

    if (isFullyRefunded && hasRefund && orderIsReturned) {
      console.log("🎉 TEST PASSED! ✅");
      console.log("   ✓ Order is returned");
      console.log("   ✓ Refund was created");
      console.log("   ✓ Full amount was refunded");
      return true;
    } else {
      console.log("❌ TEST FAILED!");
      if (!orderIsReturned) {
        console.log("   ✗ Order is not returned");
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
testOrderReturnRefund()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });


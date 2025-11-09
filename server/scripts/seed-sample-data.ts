import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/database";
import { StoreModel } from "../src/models/StoreModel";
import { OrderModel } from "../src/models/OrderModel";
import { UserModel, User } from "../src/models/UserModel";
import type { Store } from "../src/types/store";

dotenv.config({ path: path.join(__dirname, "../.env") });

const SEED_USER_EMAIL =
  process.env.SEED_USER_EMAIL || "test.customer@invictusmall.com";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || "Test123!";

async function ensureTestUser(userModel: UserModel): Promise<User> {
  let user = await userModel.getUserByEmail(SEED_USER_EMAIL);
  if (user) {
    console.log(`Using existing user ${SEED_USER_EMAIL} (${user.id})`);
    return user;
  }

  console.log(`Creating sample user ${SEED_USER_EMAIL}...`);
  const created = await userModel.createUser({
    email: SEED_USER_EMAIL,
    firstName: "Test",
    lastName: "Customer",
    phoneNumber: "555-0101",
  });

  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
  await pool.execute(
    `
      UPDATE users 
      SET password = ?, is_active = true, email_verified = true, updated_at = ?
      WHERE id = ?
    `,
    [passwordHash, new Date(), created.id]
  );

  user = await userModel.getUserById(created.id);
  console.log(
    `Created test user with email ${SEED_USER_EMAIL} (password: ${SEED_USER_PASSWORD})`
  );
  return user;
}

async function ensureSampleStores(): Promise<Store[]> {
  const existingStores = await StoreModel.findAll();
  const storesByName = new Map(existingStores.map((store) => [store.name, store]));

  const storeDefinitions = [
    {
      name: "Aurora Electronics",
      description:
        "Premium electronics and smart home devices with top-notch support.",
      category: ["Electronics", "Smart Home"],
      rating: 4.7,
      reviewCount: 482,
      imageUrl:
        "https://images.unsplash.com/photo-1510552776732-01acc9a4c1c9?auto=format&fit=crop&w=800&q=80",
      isVerified: true,
      isActive: true,
      location: [
        {
          streetAddress: "125 Market Street",
          city: "San Francisco",
          stateProvince: "CA",
          zipCode: "94105",
          country: "USA",
        },
      ],
      productsCount: 240,
      establishedYear: 2012,
    },
    {
      name: "Summit Outdoors",
      description:
        "Gear up for your next adventure with curated outdoor essentials.",
      category: ["Sports", "Outdoor"],
      rating: 4.5,
      reviewCount: 321,
      imageUrl:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
      isVerified: true,
      isActive: true,
      location: [
        {
          streetAddress: "890 Canyon Drive",
          city: "Denver",
          stateProvince: "CO",
          zipCode: "80202",
          country: "USA",
        },
      ],
      productsCount: 185,
      establishedYear: 2010,
    },
    {
      name: "Harvest Pantry",
      description:
        "Organic groceries and artisanal goods sourced from local farms.",
      category: ["Food", "Home & Garden"],
      rating: 4.8,
      reviewCount: 267,
      imageUrl:
        "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=800&q=80",
      isVerified: true,
      isActive: true,
      location: [
        {
          streetAddress: "42 Greenfield Avenue",
          city: "Portland",
          stateProvince: "OR",
          zipCode: "97204",
          country: "USA",
        },
      ],
      productsCount: 320,
      establishedYear: 2015,
      discount: "Spring Harvest Bundle - Save 15%",
    },
  ];

  const result: Store[] = [];

  for (const definition of storeDefinitions) {
    const existing = storesByName.get(definition.name);
    if (existing) {
      result.push(existing);
      continue;
    }

    const created = await StoreModel.create(definition);
    console.log(`Created store "${created.name}" (${created.id})`);
    result.push(created);
  }

  return result;
}

async function seedOrders(user: User, stores: Store[]) {
  if (stores.length === 0) {
    console.warn("No stores available to seed orders.");
    return;
  }

  const orderModel = new OrderModel();
  const existingOrders = await orderModel.getOrdersByUserId(user.id);
  if (existingOrders.length > 0) {
    console.log(
      `User ${user.email} already has ${existingOrders.length} order(s). Skipping order seeding.`
    );
    return;
  }

  const [electronicsStore, outdoorsStore] = stores;
  const orderDefinitions = [
    {
      store: electronicsStore ?? stores[0],
      paymentMethod: "Credit Card",
      status: "processing",
      items: [
        {
          productId: "ELEC-001",
          productName: "Noise-Cancelling Headphones",
          price: 199.99,
          quantity: 1,
          productImage:
            "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
        },
        {
          productId: "ELEC-002",
          productName: "Smart Home Hub",
          price: 149.99,
          quantity: 1,
          productImage:
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80",
        },
      ],
      shippingAddress: {
        streetAddress: "125 Market Street",
        city: "San Francisco",
        stateProvince: "CA",
        zipCode: "94105",
        country: "USA",
      },
    },
    {
      store: outdoorsStore ?? stores[0],
      paymentMethod: "PayPal",
      status: "delivered",
      trackingNumber: "1Z999AA10123456784",
      items: [
        {
          productId: "OUT-101",
          productName: "Ultralight Backpack",
          price: 179.0,
          quantity: 1,
          productImage:
            "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
        },
        {
          productId: "OUT-205",
          productName: "Insulated Water Bottle",
          price: 32.5,
          quantity: 2,
          productImage:
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80",
        },
      ],
      shippingAddress: {
        streetAddress: "890 Canyon Drive",
        city: "Denver",
        stateProvince: "CO",
        zipCode: "80202",
        country: "USA",
      },
    },
  ];

  for (const definition of orderDefinitions) {
    const targetStore = definition.store ?? stores[0];
    if (!targetStore) {
      console.warn("No store available to seed this order definition. Skipping.");
      continue;
    }

    const created = await orderModel.createOrder({
      userId: user.id,
      storeId: targetStore.id,
      storeName: targetStore.name,
      items: definition.items,
      shippingAddress: definition.shippingAddress,
      paymentMethod: definition.paymentMethod,
    });

    if (definition.status && definition.status !== "pending") {
      const shippedDate =
        definition.status === "processing"
          ? new Date()
          : new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
      const deliveredDate =
        definition.status === "delivered"
          ? new Date(Date.now() - 1000 * 60 * 60 * 24)
          : null;

      await pool.execute(
        `
          UPDATE orders
          SET status = ?, shipped_date = ?, delivered_date = ?, tracking_number = ?, updated_at = ?
          WHERE id = ?
        `,
        [
          definition.status,
          shippedDate,
          deliveredDate,
          definition.trackingNumber || null,
          new Date(),
          created.id,
        ]
      );
    }

    console.log(
      `Created order ${created.id} for user ${user.email} at store ${targetStore.name}`
    );
  }
}

async function main() {
  const userModel = new UserModel();

  try {
    const user = await ensureTestUser(userModel);
    const stores = await ensureSampleStores();
    await seedOrders(user, stores);
    console.log("Sample data seeded successfully.");
  } catch (error) {
    console.error("Failed to seed sample data:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();



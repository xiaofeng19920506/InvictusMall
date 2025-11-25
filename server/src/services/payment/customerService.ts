import Stripe from "stripe";

export async function getOrCreateStripeCustomer(
  stripeClient: Stripe,
  email: string,
  name?: string,
  phone?: string
): Promise<string> {
  const existingCustomers = await stripeClient.customers.list({
    email: email.trim().toLowerCase(),
    limit: 1,
  });

  const existingCustomer = existingCustomers.data[0];

  if (existingCustomer) {
    return existingCustomer.id;
  } else {
    const createdCustomer = await stripeClient.customers.create({
      email: email.trim().toLowerCase(),
      ...(name ? { name: name.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
    });
    return createdCustomer.id;
  }
}


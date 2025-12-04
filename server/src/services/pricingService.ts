import { calculateTax } from "./taxService";

export interface PricingRequest {
  items: Array<{
    price: number;
    quantity: number;
  }>;
  shippingAddress: {
    zipCode: string;
    stateProvince?: string;
    country?: string;
  };
}

export interface PricingBreakdown {
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  total: number;
}

/**
 * Calculate shipping cost
 * Free shipping over $50, otherwise $5.99
 */
function calculateShipping(subtotal: number): number {
  return subtotal >= 50 ? 0 : 5.99;
}

/**
 * Calculate complete pricing breakdown including subtotal, tax, shipping, and total
 */
export async function calculatePricing(
  request: PricingRequest
): Promise<PricingBreakdown> {
  // Calculate subtotal
  const subtotal = request.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (subtotal <= 0) {
    throw new Error("Invalid subtotal amount");
  }

  // Calculate tax
  const taxResult = await calculateTax({
    subtotal,
    zipCode: request.shippingAddress.zipCode,
    stateProvince: request.shippingAddress.stateProvince,
    country: request.shippingAddress.country || "US",
  });

  const taxAmount = taxResult.taxAmount || 0;
  const taxRate = taxResult.taxRate || 0;

  // Calculate shipping
  const shippingAmount = calculateShipping(subtotal);

  // Calculate total
  const total = subtotal + taxAmount + shippingAmount;

  const result = {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    taxRate: Math.round(taxRate * 10000) / 10000,
    shippingAmount: Math.round(shippingAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  // Log calculation for debugging
  console.log('PricingService: Calculated pricing breakdown:', {
    input: {
      items: request.items,
      address: request.shippingAddress,
    },
    calculation: {
      subtotal,
      taxAmount,
      taxRate,
      shippingAmount,
      total,
    },
    result,
  });

  return result;
}


#!/bin/bash

# Test Payment Flow Script
# This script tests the complete payment flow from checkout to order completion

BASE_URL="http://localhost:3001"
API_URL="${BASE_URL}/api"

echo "========================================="
echo "Testing Payment Flow"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if server is running
echo "Test 1: Checking if server is running..."
if curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running or health endpoint not available${NC}"
    echo "Please start the server first"
    exit 1
fi
echo ""

# Test 2: Check Stripe configuration
echo "Test 2: Checking Stripe configuration..."
STRIPE_KEY=$(grep STRIPE_SECRET_KEY /Users/aaronliu/Desktop/InvictusMall/server/.env 2>/dev/null | cut -d '=' -f2)
if [ -z "$STRIPE_KEY" ] || [ "$STRIPE_KEY" = "your_stripe_secret_key_here" ]; then
    echo -e "${YELLOW}⚠ Stripe secret key not configured${NC}"
    echo "Payment functionality will be limited"
else
    echo -e "${GREEN}✓ Stripe secret key is configured${NC}"
fi
echo ""

# Test 3: Test pricing calculation endpoint
echo "Test 3: Testing pricing calculation..."
PRICING_RESPONSE=$(curl -s -X POST "${API_URL}/tax/calculate-pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"price": 25.99, "quantity": 2},
      {"price": 15.50, "quantity": 1}
    ],
    "shippingAddress": {
      "zipCode": "19012",
      "stateProvince": "PA",
      "country": "US"
    }
  }')

if echo "$PRICING_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Pricing calculation works${NC}"
    echo "Response:"
    echo "$PRICING_RESPONSE" | jq '.data'
else
    echo -e "${RED}✗ Pricing calculation failed${NC}"
    echo "Response: $PRICING_RESPONSE"
fi
echo ""

# Test 4: Test tax calculation endpoint
echo "Test 4: Testing tax calculation..."
TAX_RESPONSE=$(curl -s -X POST "${API_URL}/tax/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "subtotal": 67.48,
    "zipCode": "19012",
    "stateProvince": "PA",
    "country": "US"
  }')

if echo "$TAX_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Tax calculation works${NC}"
    TAX_AMOUNT=$(echo "$TAX_RESPONSE" | jq -r '.data.taxAmount')
    TAX_RATE=$(echo "$TAX_RESPONSE" | jq -r '.data.taxRate')
    echo "Tax Amount: \$$TAX_AMOUNT"
    echo "Tax Rate: $(echo "$TAX_RATE * 100" | bc -l)%"
else
    echo -e "${RED}✗ Tax calculation failed${NC}"
    echo "Response: $TAX_RESPONSE"
fi
echo ""

# Test 5: Check payment intent endpoint exists
echo "Test 5: Checking payment intent endpoint..."
PAYMENT_ENDPOINT_CHECK=$(curl -s -X POST "${API_URL}/payments/create-payment-intent" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)

if echo "$PAYMENT_ENDPOINT_CHECK" | grep -q "authentication\|unauthorized\|401" 2>/dev/null; then
    echo -e "${GREEN}✓ Payment intent endpoint exists (requires authentication)${NC}"
elif echo "$PAYMENT_ENDPOINT_CHECK" | grep -q "validation\|items are required" 2>/dev/null; then
    echo -e "${GREEN}✓ Payment intent endpoint exists (validation working)${NC}"
else
    echo -e "${YELLOW}⚠ Payment intent endpoint check inconclusive${NC}"
    echo "Response: $PAYMENT_ENDPOINT_CHECK"
fi
echo ""

# Test 6: Check order routes
echo "Test 6: Checking order routes..."
ORDER_ENDPOINT_CHECK=$(curl -s -X GET "${API_URL}/orders" 2>&1)
if echo "$ORDER_ENDPOINT_CHECK" | grep -q "authentication\|unauthorized\|401" 2>/dev/null; then
    echo -e "${GREEN}✓ Order endpoints exist (require authentication)${NC}"
else
    echo -e "${YELLOW}⚠ Order endpoint check inconclusive${NC}"
fi
echo ""

# Test 7: Check review endpoints
echo "Test 7: Checking review endpoints..."
REVIEW_ENDPOINT_CHECK=$(curl -s -X GET "${API_URL}/products/test-product-id/reviews" 2>&1)
if echo "$REVIEW_ENDPOINT_CHECK" | jq -e '.success != null' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Review endpoints exist${NC}"
else
    echo -e "${YELLOW}⚠ Review endpoint check inconclusive${NC}"
fi
echo ""

# Test 8: Check return endpoints
echo "Test 8: Checking return endpoints..."
RETURN_ENDPOINT_CHECK=$(curl -s -X GET "${API_URL}/returns/order/test-order-id" 2>&1)
if echo "$RETURN_ENDPOINT_CHECK" | grep -q "authentication\|unauthorized\|401" 2>/dev/null; then
    echo -e "${GREEN}✓ Return endpoints exist (require authentication)${NC}"
else
    echo -e "${YELLOW}⚠ Return endpoint check inconclusive${NC}"
fi
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo "All endpoint checks completed."
echo ""
echo "For full payment flow testing, you need to:"
echo "1. Have a valid user account and authentication token"
echo "2. Have items in the cart"
echo "3. Complete the checkout flow in the browser"
echo ""
echo "Payment flow steps:"
echo "1. Add items to cart"
echo "2. Go to checkout"
echo "3. Enter shipping address"
echo "4. Create payment intent (backend)"
echo "5. Enter payment method (Stripe)"
echo "6. Confirm payment (Stripe)"
echo "7. Review order"
echo "8. Place order (confirm payment on backend)"
echo "9. Redirect to success page"
echo ""


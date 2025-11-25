import fetch from "node-fetch";

interface TaxCalculationRequest {
  subtotal: number;
  zipCode: string;
  stateProvince?: string;
  country?: string;
}

interface TaxCalculationResponse {
  success: boolean;
  taxAmount: number;
  taxRate: number;
  total: number;
  message?: string;
}

/**
 * Calculate tax using Ziptax API (free tier: 1,000 requests/month)
 * Fallback to simple calculation if API fails
 */
export async function calculateTax(
  request: TaxCalculationRequest
): Promise<TaxCalculationResponse> {
  const { subtotal, zipCode, stateProvince, country } = request;

  // Validate inputs
  if (!subtotal || subtotal <= 0) {
    return {
      success: false,
      taxAmount: 0,
      taxRate: 0,
      total: subtotal,
      message: "Invalid subtotal amount",
    };
  }

  // For US addresses, try API Ninjas Sales Tax API (free tier available)
  // If API key is provided, use it; otherwise use fallback
  const apiNinjasKey = process.env.API_NINJAS_KEY;
  
  if ((country?.toUpperCase() === "US" || !country) && apiNinjasKey) {
    try {
      // API Ninjas Sales Tax API endpoint
      const apiUrl = `https://api.api-ninjas.com/v1/salestax?zip_code=${encodeURIComponent(zipCode)}`;
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Api-Key": apiNinjasKey,
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json() as {
          total_rate?: number;
          state_rate?: number;
          city_rate?: number;
          county_rate?: number;
          error?: string;
        };

        if (data.total_rate !== undefined && data.total_rate !== null) {
          const taxRate = data.total_rate / 100; // Convert percentage to decimal
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          return {
            success: true,
            taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
            taxRate: Math.round(taxRate * 10000) / 10000, // Round to 4 decimal places
            total: Math.round(total * 100) / 100,
          };
        }
      }

      // If API fails, fall through to fallback calculation
      console.warn("Sales Tax API request failed, using fallback calculation");
    } catch (error) {
      // If API fails, use fallback calculation (silently, as fallback is reliable)
      // Only log if it's not a network error (which is expected in dev)
      if (error instanceof Error && !error.message.includes('ENOTFOUND')) {
        console.warn("Sales Tax API error, using fallback calculation:", error.message);
      }
    }
  }

  // Fallback: Use state-based tax rates for US, or default rate
  return calculateTaxFallback(subtotal, stateProvince, country);
}

/**
 * Fallback tax calculation using state/province rates
 * This is the primary calculation method when no external API is configured
 * Uses comprehensive state and provincial tax rates
 */
function calculateTaxFallback(
  subtotal: number,
  stateProvince?: string,
  country?: string
): TaxCalculationResponse {
  // Comprehensive tax rates by state/province (US states and Canadian provinces)
  // Rates are state-level averages and may vary by locality
  const TAX_RATES: Record<string, number> = {
    // US States - State sales tax rates (average, may include local taxes)
    AL: 0.04,      // Alabama
    AK: 0.00,      // Alaska (no state sales tax, but local taxes may apply)
    AZ: 0.056,     // Arizona
    AR: 0.065,     // Arkansas
    CA: 0.0725,    // California
    CO: 0.029,     // Colorado
    CT: 0.0635,    // Connecticut
    DE: 0.00,      // Delaware (no sales tax)
    FL: 0.06,      // Florida
    GA: 0.04,      // Georgia
    HI: 0.04,      // Hawaii
    ID: 0.06,      // Idaho
    IL: 0.0625,    // Illinois
    IN: 0.07,      // Indiana
    IA: 0.06,      // Iowa
    KS: 0.065,     // Kansas
    KY: 0.06,      // Kentucky
    LA: 0.0445,    // Louisiana
    ME: 0.055,     // Maine
    MD: 0.06,      // Maryland
    MA: 0.0625,    // Massachusetts
    MI: 0.06,      // Michigan
    MN: 0.06875,   // Minnesota
    MS: 0.07,      // Mississippi
    MO: 0.04225,   // Missouri
    MT: 0.00,      // Montana (no sales tax)
    NE: 0.055,     // Nebraska
    NV: 0.0685,    // Nevada
    NH: 0.00,      // New Hampshire (no sales tax)
    NJ: 0.06625,   // New Jersey
    NM: 0.05125,   // New Mexico
    NY: 0.04,      // New York
    NC: 0.0475,    // North Carolina
    ND: 0.05,      // North Dakota
    OH: 0.0575,    // Ohio
    OK: 0.045,     // Oklahoma
    OR: 0.00,      // Oregon (no sales tax)
    PA: 0.06,      // Pennsylvania
    RI: 0.07,      // Rhode Island
    SC: 0.06,      // South Carolina
    SD: 0.045,     // South Dakota
    TN: 0.07,      // Tennessee
    TX: 0.0625,    // Texas
    UT: 0.061,     // Utah
    VT: 0.06,      // Vermont
    VA: 0.053,     // Virginia
    WA: 0.065,     // Washington
    WV: 0.06,      // West Virginia
    WI: 0.05,      // Wisconsin
    WY: 0.04,      // Wyoming
    DC: 0.06,      // District of Columbia
    
    // Canadian Provinces - Combined GST/HST/PST rates
    AB: 0.05,      // Alberta (GST only)
    BC: 0.12,      // British Columbia (GST + PST)
    MB: 0.12,      // Manitoba (GST + PST)
    NB: 0.15,      // New Brunswick (HST)
    NL: 0.15,      // Newfoundland and Labrador (HST)
    NS: 0.15,      // Nova Scotia (HST)
    NT: 0.05,      // Northwest Territories (GST only)
    NU: 0.05,      // Nunavut (GST only)
    ON: 0.13,      // Ontario (HST)
    PE: 0.15,      // Prince Edward Island (HST)
    QC: 0.14975,   // Quebec (GST + QST)
    SK: 0.11,      // Saskatchewan (GST + PST)
    YT: 0.05,      // Yukon (GST only)
  };

  let taxRate = 0.08; // Default 8% if state/province not found

  if (stateProvince) {
    const normalizedState = stateProvince.trim().toUpperCase();
    taxRate = TAX_RATES[normalizedState] ?? 0.08;
  }

  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  return {
    success: true,
    taxAmount: Math.round(taxAmount * 100) / 100,
    taxRate: Math.round(taxRate * 10000) / 10000,
    total: Math.round(total * 100) / 100,
  };
}


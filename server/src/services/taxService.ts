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
 * Calculate tax using Ziptax API (api.zip-tax.com)
 * Requires ZIPTAX_API_KEY environment variable
 * Uses official v60 endpoint with X-API-KEY header
 * Falls back to state-based calculation if API fails or API key is not provided
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

  // For US addresses, try Ziptax API (api.zip-tax.com)
  // If API key is provided, use it; otherwise use fallback
  const zipTaxApiKey = process.env.ZIPTAX_API_KEY;

  if ((country?.toUpperCase() === "US" || !country) && zipTaxApiKey) {
    try {
      // Build address string from available information
      // Ziptax API requires a full address, but we'll use ZIP code if address is not available
      let addressParam = zipCode;

      // If we have state/province, include it for better accuracy
      if (stateProvince) {
        addressParam = `${zipCode}, ${stateProvince}`;
      }

      // Ziptax API endpoint - v60 (official format)
      const apiUrl = `https://api.zip-tax.com/request/v60?key=${encodeURIComponent(
        zipTaxApiKey
      )}&address=${encodeURIComponent(
        addressParam
      )}&format=json&countryCode=USA&taxabilityCode=10000`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "X-API-KEY": zipTaxApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const responseText = await response.text();
        let data: any;

        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.warn("Ziptax API returned non-JSON response:", responseText);
          // Fall through to fallback calculation
          throw new Error("Invalid JSON response from Ziptax API");
        }

        // Check for errors in response
        if (data.error || data.Error || data.status === "error") {
          console.warn(
            "Ziptax API returned error:",
            data.error || data.Error || data.message
          );
          // Fall through to fallback calculation
        } else if (data.taxSales && typeof data.taxSales === "number") {
          // Ziptax returns tax rate as a percentage (e.g., 8.0 for 8%)
          // Convert to decimal
          const taxRate = data.taxSales / 100;
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          console.log("Ziptax API calculation:", {
            zipCode,
            addressParam,
            taxRate,
            taxAmount,
            subtotal,
            total,
            apiResponse: data,
          });

          return {
            success: true,
            taxAmount: Math.round(taxAmount * 100) / 100, // Round to 2 decimal places
            taxRate: Math.round(taxRate * 10000) / 10000, // Round to 4 decimal places
            total: Math.round(total * 100) / 100,
          };
        } else if (data.taxRate && typeof data.taxRate === "number") {
          // Alternative response format - taxRate as decimal
          const taxRate = data.taxRate;
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          console.log("Ziptax API calculation (alternative format):", {
            zipCode,
            addressParam,
            taxRate,
            taxAmount,
            subtotal,
            total,
          });

          return {
            success: true,
            taxAmount: Math.round(taxAmount * 100) / 100,
            taxRate: Math.round(taxRate * 10000) / 10000,
            total: Math.round(total * 100) / 100,
          };
        } else {
          console.warn("Ziptax API returned unexpected response format:", data);
          // Fall through to fallback calculation
        }
      } else {
        // If API returns non-OK status, log and fall through to fallback
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(
          "Ziptax API request failed with status:",
          response.status,
          errorText
        );
      }

      // If API fails, fall through to fallback calculation
    } catch (error) {
      // If API fails, use fallback calculation (silently, as fallback is reliable)
      // Only log if it's not a network error (which is expected in dev)
      if (error instanceof Error && !error.message.includes("ENOTFOUND")) {
        console.warn(
          "Ziptax API error, using fallback calculation:",
          error.message
        );
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
    AL: 0.04, // Alabama
    AK: 0.0, // Alaska (no state sales tax, but local taxes may apply)
    AZ: 0.056, // Arizona
    AR: 0.065, // Arkansas
    CA: 0.0725, // California
    CO: 0.029, // Colorado
    CT: 0.0635, // Connecticut
    DE: 0.0, // Delaware (no sales tax)
    FL: 0.06, // Florida
    GA: 0.04, // Georgia
    HI: 0.04, // Hawaii
    ID: 0.06, // Idaho
    IL: 0.0625, // Illinois
    IN: 0.07, // Indiana
    IA: 0.06, // Iowa
    KS: 0.065, // Kansas
    KY: 0.06, // Kentucky
    LA: 0.0445, // Louisiana
    ME: 0.055, // Maine
    MD: 0.06, // Maryland
    MA: 0.0625, // Massachusetts
    MI: 0.06, // Michigan
    MN: 0.06875, // Minnesota
    MS: 0.07, // Mississippi
    MO: 0.04225, // Missouri
    MT: 0.0, // Montana (no sales tax)
    NE: 0.055, // Nebraska
    NV: 0.0685, // Nevada
    NH: 0.0, // New Hampshire (no sales tax)
    NJ: 0.06625, // New Jersey
    NM: 0.05125, // New Mexico
    NY: 0.04, // New York
    NC: 0.0475, // North Carolina
    ND: 0.05, // North Dakota
    OH: 0.0575, // Ohio
    OK: 0.045, // Oklahoma
    OR: 0.0, // Oregon (no sales tax)
    PA: 0.06, // Pennsylvania
    RI: 0.07, // Rhode Island
    SC: 0.06, // South Carolina
    SD: 0.045, // South Dakota
    TN: 0.07, // Tennessee
    TX: 0.0625, // Texas
    UT: 0.061, // Utah
    VT: 0.06, // Vermont
    VA: 0.053, // Virginia
    WA: 0.065, // Washington
    WV: 0.06, // West Virginia
    WI: 0.05, // Wisconsin
    WY: 0.04, // Wyoming
    DC: 0.06, // District of Columbia

    // Canadian Provinces - Combined GST/HST/PST rates
    AB: 0.05, // Alberta (GST only)
    BC: 0.12, // British Columbia (GST + PST)
    MB: 0.12, // Manitoba (GST + PST)
    NB: 0.15, // New Brunswick (HST)
    NL: 0.15, // Newfoundland and Labrador (HST)
    NS: 0.15, // Nova Scotia (HST)
    NT: 0.05, // Northwest Territories (GST only)
    NU: 0.05, // Nunavut (GST only)
    ON: 0.13, // Ontario (HST)
    PE: 0.15, // Prince Edward Island (HST)
    QC: 0.14975, // Quebec (GST + QST)
    SK: 0.11, // Saskatchewan (GST + PST)
    YT: 0.05, // Yukon (GST only)
  };

  let taxRate = 0.0; // Default 0% if state/province not found

  if (stateProvince) {
    const normalizedState = stateProvince.trim().toUpperCase();

    // First try direct lookup (for state codes like "DE", "CA", etc.)
    if (TAX_RATES[normalizedState] !== undefined) {
      taxRate = TAX_RATES[normalizedState];
    } else {
      // Try to match full state names to codes
      const stateNameToCode: Record<string, string> = {
        ALABAMA: "AL",
        ALASKA: "AK",
        ARIZONA: "AZ",
        ARKANSAS: "AR",
        CALIFORNIA: "CA",
        COLORADO: "CO",
        CONNECTICUT: "CT",
        DELAWARE: "DE",
        FLORIDA: "FL",
        GEORGIA: "GA",
        HAWAII: "HI",
        IDAHO: "ID",
        ILLINOIS: "IL",
        INDIANA: "IN",
        IOWA: "IA",
        KANSAS: "KS",
        KENTUCKY: "KY",
        LOUISIANA: "LA",
        MAINE: "ME",
        MARYLAND: "MD",
        MASSACHUSETTS: "MA",
        MICHIGAN: "MI",
        MINNESOTA: "MN",
        MISSISSIPPI: "MS",
        MISSOURI: "MO",
        MONTANA: "MT",
        NEBRASKA: "NE",
        NEVADA: "NV",
        "NEW HAMPSHIRE": "NH",
        "NEW JERSEY": "NJ",
        "NEW MEXICO": "NM",
        "NEW YORK": "NY",
        "NORTH CAROLINA": "NC",
        "NORTH DAKOTA": "ND",
        OHIO: "OH",
        OKLAHOMA: "OK",
        OREGON: "OR",
        PENNSYLVANIA: "PA",
        "RHODE ISLAND": "RI",
        "SOUTH CAROLINA": "SC",
        "SOUTH DAKOTA": "SD",
        TENNESSEE: "TN",
        TEXAS: "TX",
        UTAH: "UT",
        VERMONT: "VT",
        VIRGINIA: "VA",
        WASHINGTON: "WA",
        "WEST VIRGINIA": "WV",
        WISCONSIN: "WI",
        WYOMING: "WY",
        "DISTRICT OF COLUMBIA": "DC",
        // Canadian provinces
        ALBERTA: "AB",
        "BRITISH COLUMBIA": "BC",
        MANITOBA: "MB",
        "NEW BRUNSWICK": "NB",
        "NEWFOUNDLAND AND LABRADOR": "NL",
        NEWFOUNDLAND: "NL",
        LABRADOR: "NL",
        "NOVA SCOTIA": "NS",
        "NORTHWEST TERRITORIES": "NT",
        NUNAVUT: "NU",
        ONTARIO: "ON",
        "PRINCE EDWARD ISLAND": "PE",
        QUEBEC: "QC",
        SASKATCHEWAN: "SK",
        YUKON: "YT",
      };

      const stateCode = stateNameToCode[normalizedState];
      if (stateCode && TAX_RATES[stateCode] !== undefined) {
        taxRate = TAX_RATES[stateCode];
      }
      // If still not found, use default 8%
    }
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

import fetch from "node-fetch";

interface AddressValidationRequest {
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
}

interface GeoapifyAddressValidationResponse {
  success: boolean;
  valid: boolean;
  normalizedAddress?: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  confidence?: number;
  message?: string;
}

interface GeoapifyGeocodeResponse {
  features: Array<{
    properties: {
      formatted: string;
      housenumber?: string;
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
      country_code?: string;
      confidence?: number;
      result_type?: string;
      lat?: number;
      lon?: number;
    };
  }>;
}

export class AddressValidationService {
  private apiKey: string;
  private baseUrl = "https://api.geoapify.com/v1";

  constructor() {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.warn("GEOAPIFY_API_KEY not found in environment variables. Address validation will be disabled.");
      console.warn("To enable address validation, add GEOAPIFY_API_KEY to your .env file");
      console.warn("Get your free API key at: https://www.geoapify.com/");
      this.apiKey = "";
    } else {
      this.apiKey = apiKey.trim();
      console.log(`✓ Geoapify API key loaded (${this.apiKey.substring(0, 10)}...)`);
    }
  }

  /**
   * Validate an address using Geoapify Geocoding API
   */
  async validateAddress(
    address: AddressValidationRequest
  ): Promise<GeoapifyAddressValidationResponse> {
    // If API key is not configured, block validation
    // This ensures addresses are only saved when validation is properly configured
    if (!this.apiKey) {
      return {
        success: false,
        valid: false,
        message: "Address validation is required but not configured. Please configure GEOAPIFY_API_KEY.",
      };
    }

    try {
      // Build the full address string for Geoapify
      const addressParts = [
        address.streetAddress,
        address.aptNumber ? `Apt ${address.aptNumber}` : null,
        address.city,
        address.stateProvince,
        address.zipCode,
        address.country,
      ].filter(Boolean);

      const fullAddress = addressParts.join(", ");

      // Call Geoapify Geocoding API
      const params = new URLSearchParams({
        text: fullAddress,
        apiKey: this.apiKey,
        limit: "1",
        format: "geojson",
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/search?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Geoapify API error:", errorData);
        
        if (response.status === 401 || response.status === 403) {
          console.error("Geoapify API authentication failed. Please check:");
          console.error("1. GEOAPIFY_API_KEY is set in your .env file");
          console.error("2. The API key is correct");
          console.error("3. You haven't exceeded your API quota (free tier: 3,000 requests/day)");
        }
        
        throw new Error(
          `Geoapify API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json() as GeoapifyGeocodeResponse;

      // Check if we got any results
      if (!data.features || data.features.length === 0) {
        return {
          success: true,
          valid: false,
          message: "Address could not be found. Please check the address details.",
        };
      }

      // Get the first (best) match
      const feature = data.features[0];
      if (!feature || !feature.properties) {
        return {
          success: true,
          valid: false,
          message: "Address could not be found. Please check the address details.",
        };
      }
      
      const properties = feature.properties;
      
      // Determine validity based on confidence score and result type
      // Confidence: 1 = exact match, lower = less precise
      // Result type: 'building' or 'house' = most accurate
      const confidence = properties.confidence || 0;
      const resultType = properties.result_type || "";
      const isBuilding = resultType === "building" || resultType === "house";
      const isStreet = resultType === "street";
      
      // Consider valid if confidence is high (>0.7) or if it's a building/house match
      const isValid = confidence > 0.7 || (isBuilding && confidence > 0.5);

      // Build normalized address from Geoapify response
      let normalizedAddress;
      if (properties) {
        const streetAddress = [
          properties.housenumber,
          properties.street,
        ].filter(Boolean).join(" ");

        normalizedAddress = {
          formattedAddress: properties.formatted || fullAddress,
          streetAddress: streetAddress || address.streetAddress,
          city: properties.city || address.city,
          state: properties.state || address.stateProvince,
          zipCode: properties.postcode || address.zipCode,
          country: properties.country || address.country,
        };
      }

      return {
        success: true,
        valid: isValid,
        normalizedAddress,
        confidence: confidence,
        message: isValid
          ? "Address validated successfully"
          : isStreet
          ? "Street found but building number may be missing. Please verify the address."
          : confidence > 0.5
          ? "Address partially verified. Please review and confirm the address details."
          : "Address could not be verified. Please check the address details.",
      };
    } catch (error: any) {
      console.error("Address validation error:", error);
      // Block submission when validation service is unavailable
      // This ensures data quality - we only save validated addresses
      return {
        success: false,
        valid: false, // Block saving when validation service is unavailable
        message: `Address validation service is temporarily unavailable. Please try again later.`,
      };
    }
  }
}

export const addressValidationService = new AddressValidationService();


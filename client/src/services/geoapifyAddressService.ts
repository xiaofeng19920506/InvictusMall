/**
 * Geoapify Address Service for Client-Side Address Validation and Autocomplete
 * Uses Geoapify API key (can be used safely on client-side with restrictions)
 */

interface AddressSuggestion {
  formattedAddress: string;
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

interface GeoapifyAutocompleteResponse {
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
      result_type?: string;
      rank?: {
        confidence?: number;
        confidence_city_level?: number;
        confidence_street_level?: number;
        confidence_building_level?: number;
        match_type?: string;
      };
    };
  }>;
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
      result_type?: string;
      rank?: {
        confidence?: number;
        confidence_city_level?: number;
        confidence_street_level?: number;
        confidence_building_level?: number;
        match_type?: string;
      };
    };
  }>;
}

class GeoapifyAddressService {
  private apiKey: string;
  private baseUrl = 'https://api.geoapify.com/v1';

  constructor() {
    // Use API key from environment variable
    const key = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!key) {
      console.warn('NEXT_PUBLIC_GEOAPIFY_API_KEY not found. Address autocomplete will be disabled.');
      console.warn('Get your free API key at: https://www.geoapify.com/');
      this.apiKey = '';
    } else {
      this.apiKey = key.trim();
    }
  }

  /**
   * Get address suggestions/autocomplete as user types
   */
  async autocomplete(query: string, countryCode: string = 'US'): Promise<AddressSuggestion[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      // Use Geoapify Autocomplete API
      // Note: The 'type' parameter format may cause 400 errors
      // Using only filter parameter for country restriction
      const params = new URLSearchParams({
        text: query,
        apiKey: this.apiKey,
        limit: '5',
        format: 'geojson',
        filter: `countrycode:${countryCode}`,
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/autocomplete?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error('Geoapify autocomplete error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json() as GeoapifyAutocompleteResponse;
      
      if (data.features && Array.isArray(data.features)) {
        return data.features.map((feature) => {
          const props = feature.properties;
          const streetAddress = [props.housenumber, props.street].filter(Boolean).join(' ');
          
          return {
            formattedAddress: props.formatted || '',
            streetNumber: props.housenumber || '',
            street: props.street || '',
            city: props.city || '',
            state: props.state || '',
            stateCode: props.state || '',
            postalCode: props.postcode || '',
            country: props.country || '',
            countryCode: props.country_code?.toUpperCase() || countryCode,
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Error fetching address autocomplete:', error);
      return [];
    }
  }

  /**
   * Validate an address on the client side (pre-validation before submit)
   */
  async validateAddress(address: {
    streetAddress: string;
    aptNumber?: string;
    city: string;
    stateProvince: string;
    zipCode: string;
    country: string;
  }): Promise<{
    valid: boolean;
    message: string;
    normalizedAddress?: AddressSuggestion;
    skipped?: boolean; // Indicates if validation was skipped (e.g., no API key)
  }> {
    if (!this.apiKey) {
      // When API key is not configured, we can't validate
      // Return valid: false to indicate validation couldn't be performed
      // The calling code can decide whether to allow or block
      return {
        valid: false,
        message: 'Address validation is not available. Please configure the API key to enable validation.',
        skipped: true,
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

      const fullAddress = addressParts.join(', ');

      // Call Geoapify Geocoding API
      const params = new URLSearchParams({
        text: fullAddress,
        apiKey: this.apiKey,
        limit: '1',
        format: 'geojson',
      });

      const response = await fetch(
        `${this.baseUrl}/geocode/search?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return {
          valid: false,
          message: 'Unable to validate address at this time',
        };
      }

      const data = await response.json() as GeoapifyGeocodeResponse;

      if (!data.features || data.features.length === 0) {
        return {
          valid: false,
          message: 'Address could not be found. Please check the address details.',
        };
      }

      const feature = data.features[0];
      const props = feature.properties;
      
      // According to Geoapify API, confidence is in properties.rank.confidence
      // For building/house types, use building_level confidence for more accuracy
      const rank = props.rank;
      const resultType = (props.result_type || '').toLowerCase();
      const isBuilding = resultType === 'building' || resultType === 'house';
      
      // Use building-level confidence if available and it's a building/house type
      // Otherwise use overall confidence
      const confidence = isBuilding && rank?.confidence_building_level !== undefined
        ? rank.confidence_building_level
        : (rank?.confidence !== undefined 
          ? rank.confidence 
          : 0.8); // Default to 0.8 if confidence not found
      
      // Log for debugging (can be removed in production)
      console.log('Geoapify client validation response:', {
        confidence,
        resultType,
        matchType: rank?.match_type,
        buildingLevelConfidence: rank?.confidence_building_level,
        formatted: props.formatted,
      });
      
      // Accept multiple valid result types
      const isValidResultType = [
        'building',
        'house', 
        'address',
        'postcode',
        'street',
        'locality',
        'city',
      ].includes(resultType.toLowerCase());
      
      // More lenient validation - same as server:
      // 1. Moderate confidence (>0.5) - general acceptance
      // 2. Building/house type with confidence >0.3 - most precise type, be lenient
      // 3. Valid result types (address, postcode, etc.) with confidence >0.4
      // Note: isBuilding is already declared above
      const isValid = 
        confidence > 0.5 || // Main threshold: accept if confidence > 50%
        (isBuilding && confidence > 0.3) || // Building/house with at least 30% confidence
        (isValidResultType && confidence > 0.4); // Valid result type with at least 40% confidence

      if (isValid) {
        const streetAddress = [props.housenumber, props.street].filter(Boolean).join(' ');
        
        // Provide appropriate message based on result type and confidence
        let message = 'Address validated successfully';
        if (resultType === 'street' && confidence < 0.7) {
          message = 'Street found. Address may need verification.';
        } else if (confidence < 0.7) {
          message = 'Address partially verified. Please review the details.';
        }
        
        return {
          valid: true,
          message: message,
          normalizedAddress: {
            formattedAddress: props.formatted || fullAddress,
            streetNumber: props.housenumber || '',
            street: props.street || '',
            city: props.city || address.city,
            state: props.state || address.stateProvince,
            stateCode: props.state || address.stateProvince,
            postalCode: props.postcode || address.zipCode,
            country: props.country || address.country,
            countryCode: props.country_code?.toUpperCase() || this.getCountryCode(address.country),
          },
        };
      } else {
        return {
          valid: false,
          message: `Address validation failed. Confidence: ${(confidence * 100).toFixed(0)}%, Type: ${resultType}. Please check the address details.`,
        };
      }
    } catch (error) {
      console.error('Error validating address:', error);
      return {
        valid: false,
        message: 'Address validation failed. Please try again.',
      };
    }
  }

  private getCountryCode(country: string): string {
    const countryMap: { [key: string]: string } = {
      'United States': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'Mexico': 'MX',
    };
    return countryMap[country] || country.substring(0, 2).toUpperCase();
  }

  private getStateCode(state: string): string {
    if (state.length === 2) {
      return state.toUpperCase();
    }

    const stateMap: { [key: string]: string } = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY',
    };

    return stateMap[state] || state.substring(0, 2).toUpperCase();
  }
}

export const geoapifyAddressService = new GeoapifyAddressService();
export type { AddressSuggestion };


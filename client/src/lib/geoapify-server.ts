const GEOAPIFY_API_KEY =
  process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";
const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1";

export interface AddressSuggestion {
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

interface GeoapifyGeocodeResponse {
  features: Array<{
    properties: {
      formatted?: string;
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

export interface ValidateAddressInput {
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
}

export interface ValidateAddressResult {
  valid: boolean;
  message: string;
  normalizedAddress?: AddressSuggestion;
}

function buildFullAddress(input: ValidateAddressInput): string {
  return [
    input.streetAddress,
    input.aptNumber ? `Apt ${input.aptNumber}` : null,
    input.city,
    input.stateProvince,
    input.zipCode,
    input.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeStateCode(state: string): string {
  if (!state) return "";
  if (state.length === 2) {
    return state.toUpperCase();
  }
  const stateMap: Record<string, string> = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
  };
  return stateMap[state] || state.substring(0, 2).toUpperCase();
}

export async function validateAddressOnServer(
  input: ValidateAddressInput
): Promise<ValidateAddressResult> {
  if (!GEOAPIFY_API_KEY) {
    return {
      valid: false,
      message:
        "Address validation is not configured. Please provide a Geoapify API key.",
    };
  }

  try {
    const params = new URLSearchParams({
      text: buildFullAddress(input),
      apiKey: GEOAPIFY_API_KEY,
      limit: "1",
      format: "geojson",
    });

    const response = await fetch(
      `${GEOAPIFY_BASE_URL}/geocode/search?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        message: "Unable to validate the address at this time.",
      };
    }

    const data = (await response.json()) as GeoapifyGeocodeResponse;

    if (!data.features || data.features.length === 0) {
      return {
        valid: false,
        message:
          "Address could not be found. Please review the entered information.",
      };
    }

    const feature = data.features[0];
    const props = feature.properties || {};
    const rank = props.rank || {};
    const resultType = (props.result_type || "").toLowerCase();
    const isBuilding = resultType === "building" || resultType === "house";
    const confidence =
      isBuilding && rank.confidence_building_level !== undefined
        ? rank.confidence_building_level
        : rank.confidence !== undefined
        ? rank.confidence
        : 0.8;

    const acceptableTypes = new Set([
      "building",
      "house",
      "address",
      "postcode",
      "street",
      "locality",
      "city",
    ]);

    const isValid =
      confidence > 0.5 ||
      (isBuilding && confidence > 0.3) ||
      (acceptableTypes.has(resultType) && confidence > 0.4);

    if (!isValid) {
      return {
        valid: false,
        message: `Address validation failed. Confidence: ${Math.round(
          confidence * 100
        )}% (${resultType || "unknown"}).`,
      };
    }

    const suggestion: AddressSuggestion = {
      formattedAddress: props.formatted || buildFullAddress(input),
      streetNumber: props.housenumber || "",
      street: props.street || "",
      city: props.city || input.city,
      state: props.state || input.stateProvince,
      stateCode: normalizeStateCode(props.state || input.stateProvince),
      postalCode: props.postcode || input.zipCode,
      country: props.country || input.country,
      countryCode: (props.country_code || input.country).toUpperCase(),
    };

    let message = "Address validated successfully.";
    if (resultType === "street" && confidence < 0.7) {
      message = "Street found. Address may need additional verification.";
    } else if (confidence < 0.7) {
      message = "Address partially verified. Please review the details.";
    }

    return {
      valid: true,
      message,
      normalizedAddress: suggestion,
    };
  } catch (error) {
    console.error("Geoapify validation error:", error);
    return {
      valid: false,
      message:
        "Address validation failed due to a service error. Please try again later.",
    };
  }
}



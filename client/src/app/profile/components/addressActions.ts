"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateAddressOnServer } from "@/lib/geoapify-server";

const API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

interface AddressPayload {
  label?: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

function buildRedirectUrl(
  base: string,
  status: "success" | "error",
  message: string
) {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}status=${status}&message=${encodeURIComponent(
    message
  )}`;
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (!value) return false;
  const stringValue = String(value).toLowerCase();
  return stringValue === "true" || stringValue === "on" || stringValue === "1";
}

async function withAuthenticatedFetch(
  path: string,
  init: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const headers: HeadersInit = {
    ...(init.headers || {}),
    Cookie: cookieHeader,
  };

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    next: { revalidate: 0 },
  });
}

function extractAddressPayload(formData: FormData): AddressPayload {
  const rawStreet = formData.get("streetAddress");
  const streetAddress =
    (typeof rawStreet === "string" ? rawStreet.trim() : "") || "";
  const normalizedStreet =
    streetAddress.length === 0 && rawStreet instanceof File
      ? ""
      : streetAddress;

  if (!normalizedStreet && rawStreet && typeof rawStreet !== "string") {
    console.warn(
      "[AddressActions] Unexpected streetAddress form value type:",
      rawStreet
    );
  }

  const rawLabel = formData.get("label");
  const label =
    typeof rawLabel === "string" && rawLabel.trim().length > 0
      ? rawLabel.trim()
      : undefined;

  const rawApt = formData.get("aptNumber");
  const aptNumber =
    typeof rawApt === "string" && rawApt.trim().length > 0
      ? rawApt.trim()
      : undefined;

  const payload: AddressPayload = {
    fullName: String(formData.get("fullName") || "").trim(),
    phoneNumber: String(formData.get("phoneNumber") || "").trim(),
    streetAddress: normalizedStreet,
    city: String(formData.get("city") || "").trim(),
    stateProvince: String(formData.get("stateProvince") || "").trim(),
    zipCode: String(formData.get("zipCode") || "").trim(),
    country: String(formData.get("country") || "").trim() || "USA",
    isDefault: parseBoolean(formData.get("isDefault")),
  };

  if (label) {
    payload.label = label;
  }

  if (aptNumber) {
    payload.aptNumber = aptNumber;
  }

  return payload;
}

function ensureRequiredFields(
  payload: AddressPayload
): asserts payload is AddressPayload {
  const requiredFields: Array<keyof AddressPayload> = [
    "fullName",
    "phoneNumber",
    "streetAddress",
    "city",
    "stateProvince",
    "zipCode",
    "country",
  ];

  for (const field of requiredFields) {
    const value = payload[field];
    if (!value || (typeof value === "string" && value.trim().length === 0)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

export async function createAddressAction(formData: FormData) {
  const successRedirect =
    (formData.get("successRedirect") as string) || "/profile?tab=addresses";
  const errorRedirect =
    (formData.get("errorRedirect") as string) ||
    "/profile?tab=addresses&showAdd=1";

  let payload: AddressPayload;

  try {
    payload = extractAddressPayload(formData);
    ensureRequiredFields(payload);
    console.info("[AddressActions] createAddressAction: payload prepared", {
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      streetAddress: payload.streetAddress,
      city: payload.city,
      stateProvince: payload.stateProvince,
      zipCode: payload.zipCode,
      isDefault: Boolean(payload.isDefault),
    });
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Invalid address submission.";
    redirect(buildRedirectUrl(errorRedirect, "error", message));
  }

  try {
    const validation = await validateAddressOnServer({
      streetAddress: payload.streetAddress,
      aptNumber: payload.aptNumber || undefined,
      city: payload.city,
      stateProvince: payload.stateProvince,
      zipCode: payload.zipCode,
      country: payload.country,
    });

    console.info("[AddressActions] createAddressAction: validation result", {
      valid: validation.valid,
      message: validation.message,
      normalized: Boolean(validation.normalizedAddress),
    });

    if (!validation.valid) {
      redirect(
        buildRedirectUrl(
          errorRedirect,
          "error",
          validation.message ||
            "Address validation failed. Please check the details."
        )
      );
    }

    if (validation.normalizedAddress) {
      const normalized = validation.normalizedAddress;
      payload = {
        ...payload,
        streetAddress:
          [normalized.streetNumber, normalized.street]
            .filter(Boolean)
            .join(" ")
            .trim() || payload.streetAddress,
        city: normalized.city || payload.city,
        stateProvince: normalized.stateCode || payload.stateProvince,
        zipCode: normalized.postalCode || payload.zipCode,
        country: normalized.country || payload.country,
      };
    }
  } catch (error) {
    console.error("Address validation error:", error);
    redirect(
      buildRedirectUrl(
        errorRedirect,
        "error",
        "Address validation service is unavailable. Please try again later."
      )
    );
  }

  try {
    console.info("[AddressActions] createAddressAction: submitting payload", {
      ...payload,
    });

    const response = await withAuthenticatedFetch("/api/shipping-addresses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.info("[AddressActions] createAddressAction: API response", {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorMessage = "Failed to save address.";
      let errorDetails: unknown;
      try {
        const data = await response.json();
        errorMessage = data.message || errorMessage;
        errorDetails = data.errors || data.error || data.validationDetails;

        if (Array.isArray(data.errors) && data.errors.length > 0) {
          errorMessage = data.errors[0].msg || errorMessage;
        }
      } catch {
        // ignore JSON parse errors
      }
      console.warn("[AddressActions] createAddressAction: API error details", {
        status: response.status,
        message: errorMessage,
        details: errorDetails,
      });
      redirect(buildRedirectUrl(errorRedirect, "error", errorMessage));
    }

    revalidatePath("/profile");
    return redirect(
      successRedirect.includes("status=")
        ? successRedirect
        : buildRedirectUrl(
            successRedirect,
            "success",
            "Address saved successfully."
          )
    );
  } catch (error) {
    const digest = (error as any)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Error creating address:", error);
    redirect(
      buildRedirectUrl(
        errorRedirect,
        "error",
        "An unexpected error occurred while saving the address."
      )
    );
  }
}

export async function updateAddressAction(formData: FormData) {
  const successRedirect =
    (formData.get("successRedirect") as string) || "/profile?tab=addresses";
  const errorRedirect =
    (formData.get("errorRedirect") as string) ||
    "/profile?tab=addresses&showAdd=1";
  const addressId = (formData.get("addressId") as string)?.trim();

  if (!addressId) {
    redirect(
      buildRedirectUrl(errorRedirect, "error", "Missing address identifier.")
    );
  }

  let payload: AddressPayload;
  try {
    payload = extractAddressPayload(formData);
    ensureRequiredFields(payload);
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Invalid address submission.";
    redirect(buildRedirectUrl(errorRedirect, "error", message));
  }

  try {
    const validation = await validateAddressOnServer({
      streetAddress: payload.streetAddress,
      aptNumber: payload.aptNumber || undefined,
      city: payload.city,
      stateProvince: payload.stateProvince,
      zipCode: payload.zipCode,
      country: payload.country,
    });

    if (!validation.valid) {
      redirect(
        buildRedirectUrl(
          errorRedirect,
          "error",
          validation.message ||
            "Address validation failed. Please check the details."
        )
      );
    }

    if (validation.normalizedAddress) {
      const normalized = validation.normalizedAddress;
      payload = {
        ...payload,
        streetAddress:
          [normalized.streetNumber, normalized.street]
            .filter(Boolean)
            .join(" ")
            .trim() || payload.streetAddress,
        city: normalized.city || payload.city,
        stateProvince: normalized.stateCode || payload.stateProvince,
        zipCode: normalized.postalCode || payload.zipCode,
        country: normalized.country || payload.country,
      };
    }
  } catch (error) {
    console.error("Address validation error:", error);
    redirect(
      buildRedirectUrl(
        errorRedirect,
        "error",
        "Address validation service is unavailable. Please try again later."
      )
    );
  }

  try {
    const response = await withAuthenticatedFetch(
      `/api/shipping-addresses/${addressId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to update address.";
      try {
        const data = await response.json();
        errorMessage = data.message || errorMessage;
      } catch {
        // ignore parse errors
      }
      redirect(buildRedirectUrl(errorRedirect, "error", errorMessage));
    }

    revalidatePath("/profile");
    redirect(
      buildRedirectUrl(
        successRedirect,
        "success",
        "Address updated successfully."
      )
    );
  } catch (error) {
    const digest = (error as any)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Error updating address:", error);
    redirect(
      buildRedirectUrl(
        errorRedirect,
        "error",
        "An unexpected error occurred while updating the address."
      )
    );
  }
}

export async function deleteAddressAction(formData: FormData) {
  const addressId = (formData.get("addressId") as string)?.trim();
  if (!addressId) {
    throw new Error("Missing address identifier.");
  }

  try {
    const response = await withAuthenticatedFetch(
      `/api/shipping-addresses/${addressId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to delete address.";
      try {
        const data = await response.json();
        errorMessage = data.message || errorMessage;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    revalidatePath("/profile");
  } catch (error) {
    console.error("Error deleting address:", error);
    throw error instanceof Error
      ? error
      : new Error("Unexpected error deleting address.");
  }
}

export async function setDefaultAddressAction(formData: FormData) {
  const addressId = (formData.get("addressId") as string)?.trim();
  if (!addressId) {
    throw new Error("Missing address identifier.");
  }

  try {
    const response = await withAuthenticatedFetch(
      `/api/shipping-addresses/${addressId}/set-default`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to set default address.";
      try {
        const data = await response.json();
        errorMessage = data.message || errorMessage;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(errorMessage);
    }

    revalidatePath("/profile");
  } catch (error) {
    console.error("Error setting default address:", error);
    throw error instanceof Error
      ? error
      : new Error("Unexpected error setting default address.");
  }
}

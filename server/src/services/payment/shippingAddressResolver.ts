import Stripe from "stripe";
import { logger } from "../../utils/logger";
import { ResolvedShippingAddress } from "./types";

export function resolveShippingAddressFromSession(
  session: Stripe.Checkout.Session
): ResolvedShippingAddress | undefined {
  const metadataAddress = session.metadata?.shipping_address;

  if (metadataAddress) {
    try {
      const parsed = JSON.parse(metadataAddress);
      if (parsed && typeof parsed === "object") {
        const streetAddress =
          parsed.streetAddress || parsed.street_address || "";
        const city = parsed.city || "";
        const stateProvince =
          parsed.stateProvince || parsed.state_province || "";
        const zipCode = parsed.zipCode || parsed.zip_code || "";
        const country = parsed.country || "";

        if (streetAddress && city && stateProvince && zipCode && country) {
          return {
            streetAddress,
            aptNumber: parsed.aptNumber || parsed.apt_number || undefined,
            city,
            stateProvince,
            zipCode,
            country,
          };
        }
      }
    } catch (error) {
      logger.warn("Unable to parse shipping address metadata", { error });
    }
  }

  const shippingDetails = session.shipping_details?.address;
  if (shippingDetails) {
    const streetAddress = shippingDetails.line1 || "";
    const city = shippingDetails.city || "";
    const stateProvince = shippingDetails.state || "";
    const zipCode = shippingDetails.postal_code || "";
    const country = shippingDetails.country || "";

    if (streetAddress && city && stateProvince && zipCode && country) {
      return {
        streetAddress,
        aptNumber: shippingDetails.line2 || undefined,
        city,
        stateProvince,
        zipCode,
        country,
      };
    }
  }

  return undefined;
}


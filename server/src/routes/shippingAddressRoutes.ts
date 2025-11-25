import { Router, Response } from "express";
import { ShippingAddressModel, CreateShippingAddressRequest, UpdateShippingAddressRequest } from "../models/ShippingAddressModel";
import {
  authenticateUserToken,
  AuthenticatedRequest,
} from "../middleware/auth";
import {
  validateCreateShippingAddress,
  validateUpdateShippingAddress,
  handleValidationErrors,
} from "../middleware/validation";
import { addressValidationService } from "../services/addressValidationService";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const router = Router();
const shippingAddressModel = new ShippingAddressModel();

/**
 * @swagger
 * /api/shipping-addresses:
 *   get:
 *     summary: Get all shipping addresses for the authenticated user
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shipping addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ShippingAddress'
 */
router.get(
  "/",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;
      const addresses = await shippingAddressModel.getAddressesByUserId(userId);

      // Ensure default address is always first in the array
      const sortedAddresses = addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      return ApiResponseHelper.success(res, sortedAddresses);
    } catch (error: any) {
      logger.error("Error fetching shipping addresses", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch shipping addresses", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses/default:
 *   get:
 *     summary: Get default shipping address for the authenticated user
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default shipping address
 *       404:
 *         description: No default address found
 */
router.get(
  "/default",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;
      const address = await shippingAddressModel.getDefaultAddress(userId);

      if (!address) {
        return ApiResponseHelper.notFound(res, "Default shipping address");
      }

      return ApiResponseHelper.success(res, address);
    } catch (error: any) {
      logger.error("Error fetching default shipping address", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch default shipping address", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses/{id}:
 *   get:
 *     summary: Get a specific shipping address by ID
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping address details
 *       404:
 *         description: Address not found
 */
router.get(
  "/:id",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, "Address ID is required");
      }
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;

      const address = await shippingAddressModel.getAddressById(id);

      // Verify the address belongs to the user
      if (address.userId !== userId) {
        return ApiResponseHelper.forbidden(res, "Unauthorized: Address does not belong to user");
      }

      return ApiResponseHelper.success(res, address);
    } catch (error: any) {
      if (error.message === "Shipping address not found") {
        return ApiResponseHelper.notFound(res, "Shipping address");
      }

      logger.error("Error fetching shipping address", error, { addressId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to fetch shipping address", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses:
 *   post:
 *     summary: Create a new shipping address
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phoneNumber
 *               - streetAddress
 *               - city
 *               - stateProvince
 *               - zipCode
 *               - country
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               streetAddress:
 *                 type: string
 *               aptNumber:
 *                 type: string
 *               city:
 *                 type: string
 *               stateProvince:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Shipping address created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
  authenticateUserToken,
  validateCreateShippingAddress,
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;
      const addressData: CreateShippingAddressRequest = req.body;

      // Validate address using Geoapify API
      const validationResult = await addressValidationService.validateAddress({
        streetAddress: addressData.streetAddress,
        aptNumber: addressData.aptNumber,
        city: addressData.city,
        stateProvince: addressData.stateProvince,
        zipCode: addressData.zipCode,
        country: addressData.country,
      });

      // If validation failed (invalid address) or validation service is unavailable, return error
      // This blocks saving invalid addresses or when validation cannot be performed
      if (!validationResult.valid) {
        return ApiResponseHelper.validationError(res, validationResult.message || "Address validation failed", {
          validationDetails: validationResult.success ? {
            confidence: validationResult.confidence,
            normalizedAddress: validationResult.normalizedAddress,
          } : undefined,
        });
      }

      // Use normalized address if available, otherwise use original
      const finalAddressData: CreateShippingAddressRequest = validationResult.normalizedAddress
        ? {
            ...addressData,
            streetAddress: validationResult.normalizedAddress.streetAddress,
            city: validationResult.normalizedAddress.city,
            stateProvince: validationResult.normalizedAddress.state,
            zipCode: validationResult.normalizedAddress.zipCode,
            country: validationResult.normalizedAddress.country,
          }
        : addressData;

      await shippingAddressModel.createAddress(userId, finalAddressData);

      // Return updated list with default address first
      const addresses = await shippingAddressModel.getAddressesByUserId(userId);
      const sortedAddresses = addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      return ApiResponseHelper.success(res, {
        addresses: sortedAddresses,
        validation: {
          validated: validationResult.success,
          normalized: !!validationResult.normalizedAddress,
        },
      }, validationResult.message || "Shipping address created successfully", 201);
    } catch (error: any) {
      logger.error("Error creating shipping address", error, { userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to create shipping address", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses/{id}:
 *   put:
 *     summary: Update a shipping address
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               streetAddress:
 *                 type: string
 *               aptNumber:
 *                 type: string
 *               city:
 *                 type: string
 *               stateProvince:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Shipping address updated successfully
 *       404:
 *         description: Address not found
 */
router.put(
  "/:id",
  authenticateUserToken,
  validateUpdateShippingAddress,
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, "Address ID is required");
      }
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;
      const addressData: UpdateShippingAddressRequest = req.body;

      // Validate address using Geoapify API if address fields are being updated
      const needsValidation = 
        addressData.streetAddress || 
        addressData.city || 
        addressData.stateProvince || 
        addressData.zipCode || 
        addressData.country;

      if (needsValidation) {
        // Get existing address to fill in missing fields
        const existingAddress = await shippingAddressModel.getAddressById(id);
        if (existingAddress.userId !== userId) {
          return ApiResponseHelper.forbidden(res, "Unauthorized: Address does not belong to user");
        }

        const validationResult = await addressValidationService.validateAddress({
          streetAddress: addressData.streetAddress || existingAddress.streetAddress,
          aptNumber: addressData.aptNumber || existingAddress.aptNumber,
          city: addressData.city || existingAddress.city,
          stateProvince: addressData.stateProvince || existingAddress.stateProvince,
          zipCode: addressData.zipCode || existingAddress.zipCode,
          country: addressData.country || existingAddress.country,
        });

        // If validation failed (invalid address) or validation service is unavailable, return error
        // This blocks saving invalid addresses or when validation cannot be performed
        if (!validationResult.valid) {
        return ApiResponseHelper.validationError(res, validationResult.message || "Address validation failed", {
          validationDetails: validationResult.success ? {
            confidence: validationResult.confidence,
            normalizedAddress: validationResult.normalizedAddress,
          } : undefined,
        });
        }

        // Use normalized address if available
        if (validationResult.normalizedAddress) {
          if (!addressData.streetAddress) addressData.streetAddress = validationResult.normalizedAddress.streetAddress;
          if (!addressData.city) addressData.city = validationResult.normalizedAddress.city;
          if (!addressData.stateProvince) addressData.stateProvince = validationResult.normalizedAddress.state;
          if (!addressData.zipCode) addressData.zipCode = validationResult.normalizedAddress.zipCode;
          if (!addressData.country) addressData.country = validationResult.normalizedAddress.country;
        }
      }

      await shippingAddressModel.updateAddress(id, userId, addressData);

      // Return updated list with default address first
      const addresses = await shippingAddressModel.getAddressesByUserId(userId);
      const sortedAddresses = addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      return ApiResponseHelper.success(res, sortedAddresses, "Shipping address updated successfully");
    } catch (error: any) {
      if (error.message === "Shipping address not found") {
        return ApiResponseHelper.notFound(res, "Shipping address");
      }

      if (error.message.includes("Unauthorized")) {
        return ApiResponseHelper.forbidden(res, error.message);
      }

      logger.error("Error updating shipping address", error, { addressId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to update shipping address", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses/{id}/set-default:
 *   post:
 *     summary: Set a shipping address as default
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address set as default successfully
 *       404:
 *         description: Address not found
 */
router.post(
  "/:id/set-default",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, "Address ID is required");
      }
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;

      await shippingAddressModel.setDefaultAddress(id, userId);

      // Return updated list with default address first
      const addresses = await shippingAddressModel.getAddressesByUserId(userId);
      const sortedAddresses = addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      return ApiResponseHelper.success(res, sortedAddresses, "Shipping address set as default successfully");
    } catch (error: any) {
      if (error.message === "Shipping address not found") {
        return ApiResponseHelper.notFound(res, "Shipping address");
      }

      if (error.message.includes("Unauthorized")) {
        return ApiResponseHelper.forbidden(res, error.message);
      }

      logger.error("Error setting default shipping address", error, { addressId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to set default shipping address", 500, error);
    }
  }
);

/**
 * @swagger
 * /api/shipping-addresses/{id}:
 *   delete:
 *     summary: Delete a shipping address
 *     tags: [Shipping Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shipping address deleted successfully
 *       404:
 *         description: Address not found
 */
router.delete(
  "/:id",
  authenticateUserToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, "Address ID is required");
      }
      if (!req.user?.id) {
        return ApiResponseHelper.unauthorized(res, "Unauthorized");
      }
      const userId = req.user.id;

      await shippingAddressModel.deleteAddress(id, userId);

      // Return updated list with default address first
      const addresses = await shippingAddressModel.getAddressesByUserId(userId);
      const sortedAddresses = addresses.sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });

      return res.json({
        success: true,
        message: "Shipping address deleted successfully",
        data: sortedAddresses,
      });
    } catch (error: any) {
      if (error.message === "Shipping address not found or unauthorized") {
        return ApiResponseHelper.notFound(res, "Shipping address");
      }

      logger.error("Error deleting shipping address", error, { addressId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, "Failed to delete shipping address", 500, error);
    }
  }
);

export default router;


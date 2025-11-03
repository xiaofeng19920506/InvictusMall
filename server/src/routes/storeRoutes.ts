import { Router, Request, Response } from 'express';
import { StoreService } from '../services/storeService';
import { validateStore, validateUpdateStore, handleValidationErrors } from '../middleware/validation';
import { ActivityLogModel } from '../models/ActivityLogModel';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
// Use real database service now that database is connected
const storeService = new StoreService();

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get all stores
 *     tags: [Stores]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter stores by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search stores by name, description, or location
 *     responses:
 *       200:
 *         description: List of stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 8
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;
    
    let stores;
    if (search && typeof search === 'string') {
      stores = await storeService.searchStores(search);
    } else if (category && typeof category === 'string') {
      stores = await storeService.getStoresByCategory(category);
    } else {
      stores = await storeService.getAllStores();
    }

    return res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/categories:
 *   get:
 *     summary: Get all store categories
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Electronics", "Fashion", "Home & Garden"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await storeService.getCategories();
    return res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/membership:
 *   get:
 *     summary: Get stores with membership
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of stores with membership retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/membership', async (req: Request, res: Response) => {
  try {
    const stores = await storeService.getMembershipStores();
    return res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch membership stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/membership/{type}:
 *   get:
 *     summary: Get stores by membership type
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [basic, premium, platinum]
 *         description: Membership type to filter by
 *     responses:
 *       200:
 *         description: List of stores with specified membership type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Invalid membership type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/membership/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!type || !['basic', 'premium', 'platinum'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type. Must be basic, premium, or platinum'
      });
    }
    
    const stores = await storeService.getStoresByMembershipType(type as 'basic' | 'premium' | 'platinum');
    return res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stores by membership type',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/premium:
 *   get:
 *     summary: Get premium and platinum stores
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of premium and platinum stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 4
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/premium', async (req: Request, res: Response) => {
  try {
    const stores = await storeService.getPremiumStores();
    return res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch premium stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/featured:
 *   get:
 *     summary: Get featured stores (premium and platinum)
 *     tags: [Stores]
 *     responses:
 *       200:
 *         description: List of featured stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 4
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/featured', async (req: Request, res: Response) => {
  try {
    // Featured stores are premium and platinum stores
    const stores = await storeService.getPremiumStores();
    return res.json({
      success: true,
      data: stores,
      count: stores.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch featured stores',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// All specific routes must come before the /:id route to avoid route conflicts
/**
 * @swagger
 * /api/stores/{id}:
 *   get:
 *     summary: Get store by ID
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }
    
    const store = await storeService.getStoreById(id);
    return res.json({
      success: true,
      data: store
    });
  } catch (error) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStoreRequest'
 *           example:
 *             name: "Tech Store"
 *             description: "Latest technology and gadgets"
 *             category: ["Electronics", "Technology"]
 *             rating: 4.5
 *             reviewCount: 100
 *             imageUrl: "https://example.com/image.jpg"
 *             isVerified: true
 *             location:
 *               - streetAddress: "123 Tech St"
 *                 city: "San Francisco"
 *                 stateProvince: "CA"
 *                 zipCode: "94102"
 *                 country: "USA"
 *             productsCount: 500
 *             establishedYear: 2020
 *             discount: "10% OFF"
 *             membership:
 *               type: "premium"
 *               benefits: ["Enhanced visibility", "Analytics dashboard"]
 *               discountPercentage: 10
 *               prioritySupport: true
 *     responses:
 *       201:
 *         description: Store created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *                 message:
 *                   type: string
 *                   example: "Store created successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', validateStore, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const store = await storeService.createStore(req.body);
    
    // Log the activity
    await ActivityLogModel.createLog({
      type: 'store_created',
      message: `New store "${store.name}" has been added`,
      storeName: store.name,
      storeId: store.id,
      metadata: {
        categories: store.category,
        rating: store.rating,
        isVerified: store.isVerified
      }
    });
    
    return res.status(201).json({
      success: true,
      data: store,
      message: 'Store created successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create store',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/{id}:
 *   put:
 *     summary: Update a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStoreRequest'
 *           example:
 *             name: "Updated Tech Store"
 *             rating: 4.8
 *             membership:
 *               type: "platinum"
 *               benefits: ["Priority listing", "24/7 support"]
 *               discountPercentage: 20
 *               prioritySupport: true
 *     responses:
 *       200:
 *         description: Store updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *                 message:
 *                   type: string
 *                   example: "Store updated successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', validateUpdateStore, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }
    
    const store = await storeService.updateStore(id, req.body);
    
    // Log the activity
    await ActivityLogModel.createLog({
      type: 'store_updated',
      message: `Store "${store.name}" information has been updated`,
      storeName: store.name,
      storeId: store.id,
      metadata: {
        updatedFields: Object.keys(req.body),
        categories: store.category,
        rating: store.rating,
        isVerified: store.isVerified
      }
    });
    
    return res.json({
      success: true,
      data: store,
      message: 'Store updated successfully'
    });
  } catch (error) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/{id}:
 *   delete:
 *     summary: Delete a store
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       204:
 *         description: Store deleted successfully
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }
    
    // Get store info before deleting for logging
    const storeToDelete = await storeService.getStoreById(id);
    
    await storeService.deleteStore(id);
    
    // Log the activity
    await ActivityLogModel.createLog({
      type: 'store_deleted',
      message: `Store "${storeToDelete.name}" has been deleted`,
      storeName: storeToDelete.name,
      storeId: storeToDelete.id,
      metadata: {
        deletedAt: new Date().toISOString(),
        categories: storeToDelete.category,
        rating: storeToDelete.rating
      }
    });
    
    return res.status(204).send();
  } catch (error) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/stores/{id}/verify:
 *   put:
 *     summary: Verify a store (Admin only)
 *     tags: [Stores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *                 message:
 *                   type: string
 *                   example: "Store verified successfully"
 *       400:
 *         description: Validation error
 *       404:
 *         description: Store not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    
    // Only admin can verify stores
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can verify stores'
      });
    }
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }
    
    // Update store verification status
    const store = await storeService.updateStore(id, { isVerified: true });
    
    // Log the activity
    await ActivityLogModel.createLog({
      type: 'store_verified',
      message: `Store "${store.name}" has been verified by admin ${user.email}`,
      storeName: store.name,
      storeId: store.id,
      metadata: {
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString()
      }
    });
    
    return res.json({
      success: true,
      data: store,
      message: 'Store verified successfully'
    });
  } catch (error) {
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500;
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

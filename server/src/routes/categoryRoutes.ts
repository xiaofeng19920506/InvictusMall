import { Router, Response, Request } from 'express';
import { CategoryModel } from '../models/CategoryModel';
import {
  authenticateAnyToken,
  AuthenticatedRequest,
} from '../middleware/auth';
import { handleETagValidation } from '../utils/cacheUtils';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();
const categoryModel = new CategoryModel();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive categories
 *       - in: query
 *         name: tree
 *         schema:
 *           type: boolean
 *         description: Return as hierarchical tree
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           enum: [1, 2, 3]
 *         description: Filter by category level
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { includeInactive, tree, level, parentId, limit, offset } = req.query;

    // Generate ETag based on last modified timestamp
    const lastModified = await CategoryModel.getLastModifiedTimestamp();
    const cacheKey = `${includeInactive || ''}-${tree || ''}-${level || ''}-${parentId || ''}-${limit || ''}-${offset || ''}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    if (tree === 'true') {
      // Return hierarchical tree
      const categories = await categoryModel.buildTree({
        includeInactive: includeInactive === 'true',
      });
      return ApiResponseHelper.success(res, categories);
    }

    if (level) {
      // Filter by level
      const categories = await categoryModel.findByLevel(parseInt(level as string));
      return ApiResponseHelper.success(res, categories);
    }

    if (parentId) {
      // Filter by parent
      const categories = await categoryModel.findByParentId(parentId as string);
      return ApiResponseHelper.success(res, categories);
    }

    // Return all categories (flat list) - with optional pagination
    if (limit !== undefined) {
      const { categories, total } = await categoryModel.findAllWithPagination({
        includeInactive: includeInactive === 'true',
        limit: parseInt(limit as string) || undefined,
        offset: offset !== undefined ? parseInt(offset as string) : undefined,
      });
      return ApiResponseHelper.successWithPagination(res, categories, total);
    }

    const categories = await categoryModel.findAll({
      includeInactive: includeInactive === 'true',
    });
    return ApiResponseHelper.successWithCount(res, categories, categories.length);
  } catch (error) {
    logger.error('Get categories error', error);
    return ApiResponseHelper.error(res, 'Failed to retrieve categories', 500, error);
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return ApiResponseHelper.validationError(res, 'Category ID is required');
    }

    // Generate ETag based on last modified timestamp
    const lastModified = await CategoryModel.getLastModifiedTimestamp();
    const cacheKey = `category-${id}`;
    
    // Check ETag validation (returns true if 304 was sent)
    if (handleETagValidation(req, res, lastModified, cacheKey)) {
      return; // 304 Not Modified already sent
    }

    const category = await categoryModel.findById(id);

    if (!category) {
      return ApiResponseHelper.notFound(res, 'Category');
    }

    return ApiResponseHelper.success(res, category);
  } catch (error) {
    logger.error('Get category error', error, { categoryId: req.params.id });
    return ApiResponseHelper.error(res, 'Failed to retrieve category', 500, error);
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  authenticateAnyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only admin can create categories
      const userRole = req.staff?.role || req.user?.role;
      if (userRole !== 'admin') {
        return ApiResponseHelper.error(res, 'Only admin can create categories', 403);
      }

      const { name, slug, description, parentId, displayOrder, isActive } = req.body;

      if (!name || !name.trim()) {
        return ApiResponseHelper.validationError(res, 'Category name is required');
      }

      const category = await categoryModel.create({
        name,
        slug,
        description,
        parentId,
        displayOrder,
        isActive,
      });

      return ApiResponseHelper.success(res, category, 'Category created successfully', 201);
    } catch (error) {
      logger.error('Create category error', error, { name: req.body.name, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to create category', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
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
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               parentId:
 *                 type: string
 *               displayOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  authenticateAnyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only admin can update categories
      const userRole = req.staff?.role || req.user?.role;
      if (userRole !== 'admin') {
        return ApiResponseHelper.error(res, 'Only admin can update categories', 403);
      }

      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, 'Category ID is required');
      }
      const { name, slug, description, parentId, displayOrder, isActive } = req.body;

      const category = await categoryModel.update(id, {
        name,
        slug,
        description,
        parentId,
        displayOrder,
        isActive,
      });

      return ApiResponseHelper.success(res, category, 'Category updated successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        return ApiResponseHelper.notFound(res, 'Category');
      }

      logger.error('Update category error', error, { categoryId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to update category', 500, error);
    }
  }
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       400:
 *         description: Cannot delete category with children
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id',
  authenticateAnyToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only admin can delete categories
      const userRole = req.staff?.role || req.user?.role;
      if (userRole !== 'admin') {
        return ApiResponseHelper.error(res, 'Only admin can delete categories', 403);
      }

      const { id } = req.params;
      if (!id) {
        return ApiResponseHelper.validationError(res, 'Category ID is required');
      }
      await categoryModel.delete(id);

      return ApiResponseHelper.success(res, null, 'Category deleted successfully');
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        return ApiResponseHelper.notFound(res, 'Category');
      }

      if (error instanceof Error && error.message.includes('children')) {
        return ApiResponseHelper.error(res, error.message, 400);
      }

      logger.error('Delete category error', error, { categoryId: req.params.id, userId: req.user?.id });
      return ApiResponseHelper.error(res, 'Failed to delete category', 500, error);
    }
  }
);

export default router;


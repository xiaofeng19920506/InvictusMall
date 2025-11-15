import { Router, Response } from 'express';
import { CategoryModel } from '../models/CategoryModel';
import {
  authenticateAnyToken,
  AuthenticatedRequest,
} from '../middleware/auth';

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
    const { includeInactive, tree, level, parentId } = req.query;

    if (tree === 'true') {
      // Return hierarchical tree
      const categories = await categoryModel.buildTree({
        includeInactive: includeInactive === 'true',
      });
      return res.json({
        success: true,
        data: categories,
      });
    }

    if (level) {
      // Filter by level
      const categories = await categoryModel.findByLevel(parseInt(level as string));
      return res.json({
        success: true,
        data: categories,
      });
    }

    if (parentId) {
      // Filter by parent
      const categories = await categoryModel.findByParentId(parentId as string);
      return res.json({
        success: true,
        data: categories,
      });
    }

    // Return all categories (flat list)
    const categories = await categoryModel.findAll({
      includeInactive: includeInactive === 'true',
    });
    return res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      return res.status(400).json({
        success: false,
        message: 'Category ID is required',
      });
    }
    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    return res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve category',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
      const { name, slug, description, parentId, displayOrder, isActive } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required',
        });
      }

      const category = await categoryModel.create({
        name,
        slug,
        description,
        parentId,
        displayOrder,
        isActive,
      });

      return res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      console.error('Create category error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required',
        });
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

      return res.json({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      console.error('Update category error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Category ID is required',
        });
      }
      await categoryModel.delete(id);

      return res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Category not found') {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      if (error instanceof Error && error.message.includes('children')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error('Delete category error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;


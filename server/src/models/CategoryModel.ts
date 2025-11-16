import { Pool } from 'mysql2/promise';
import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryTree,
} from '../types/category';

export class CategoryModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate level based on parent
   */
  private async calculateLevel(parentId?: string): Promise<number> {
    if (!parentId) {
      return 1; // Top level
    }

    const parent = await this.findById(parentId);
    if (!parent) {
      throw new Error('Parent category not found');
    }

    const level = parent.level + 1;
    if (level > 3) {
      throw new Error('Maximum category level (3) exceeded');
    }

    return level;
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryRequest): Promise<Category> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Calculate level
      const level = await this.calculateLevel(data.parentId);

      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name);

      // Check if slug already exists
      const existing = await this.findBySlug(slug);
      if (existing) {
        throw new Error('Category slug already exists');
      }

      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO categories (
          id, name, slug, description, parent_id, level,
          display_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        id,
        data.name.trim(),
        slug,
        data.description?.trim() || null,
        data.parentId || null,
        level,
        data.displayOrder ?? 0,
        data.isActive ?? true,
        now,
        now,
      ]);

      await connection.commit();
      return this.findById(id) as Promise<Category>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update an existing category
   */
  async update(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Category not found');
      }

      // Calculate new level if parent changed
      let level = existing.level;
      if (data.parentId !== undefined && data.parentId !== existing.parentId) {
        level = await this.calculateLevel(data.parentId);
        
        // Check if moving this category would create a cycle or exceed max level
        if (data.parentId === id) {
          throw new Error('Category cannot be its own parent');
        }
        
        // Check if parent is a descendant (would create cycle)
        const isDescendant = await this.isDescendant(id, data.parentId);
        if (isDescendant) {
          throw new Error('Category cannot be moved to its own descendant');
        }
      }

      // Generate slug if name changed and slug not provided
      let slug = existing.slug;
      if (data.name && (!data.slug || data.slug === existing.slug)) {
        const newSlug = this.generateSlug(data.name);
        // Only update slug if it's different and doesn't conflict
        if (newSlug !== existing.slug) {
          const existingWithSlug = await this.findBySlug(newSlug);
          if (!existingWithSlug || existingWithSlug.id === id) {
            slug = newSlug;
          }
        }
      } else if (data.slug) {
        slug = data.slug;
        // Check if new slug conflicts
        const existingWithSlug = await this.findBySlug(slug);
        if (existingWithSlug && existingWithSlug.id !== id) {
          throw new Error('Category slug already exists');
        }
      }

      const fields: string[] = [];
      const params: any[] = [];

      if (data.name !== undefined) {
        fields.push('name = ?');
        params.push(data.name.trim());
      }
      if (slug !== existing.slug) {
        fields.push('slug = ?');
        params.push(slug);
      }
      if (data.description !== undefined) {
        fields.push('description = ?');
        params.push(data.description?.trim() || null);
      }
      if (data.parentId !== undefined) {
        fields.push('parent_id = ?');
        params.push(data.parentId || null);
        fields.push('level = ?');
        params.push(level);
      }
      if (data.displayOrder !== undefined) {
        fields.push('display_order = ?');
        params.push(data.displayOrder);
      }
      if (data.isActive !== undefined) {
        fields.push('is_active = ?');
        params.push(data.isActive);
      }

      if (fields.length === 0) {
        await connection.commit();
        return this.findById(id) as Promise<Category>;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const query = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
      await connection.execute(query, params);

      await connection.commit();
      return this.findById(id) as Promise<Category>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a category
   */
  async delete(id: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check if category has children
      const children = await this.findByParentId(id);
      if (children.length > 0) {
        throw new Error('Cannot delete category with children. Delete or move children first.');
      }

      const query = 'DELETE FROM categories WHERE id = ?';
      await connection.execute(query, [id]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find category by ID
   */
  async findById(id: string): Promise<Category | null> {
    const query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
      WHERE id = ?
    `;

    const [rows] = await this.pool.execute(query, [id]);
    const categories = rows as any[];

    if (categories.length === 0) {
      return null;
    }

    return this.mapRowToCategory(categories[0]);
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<Category | null> {
    const query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
      WHERE slug = ?
    `;

    const [rows] = await this.pool.execute(query, [slug]);
    const categories = rows as any[];

    if (categories.length === 0) {
      return null;
    }

    return this.mapRowToCategory(categories[0]);
  }

  /**
   * Find all categories
   */
  async findAll(options?: { includeInactive?: boolean }): Promise<Category[]> {
    let query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
    `;

    const params: any[] = [];

    if (!options?.includeInactive) {
      query += ' WHERE is_active = TRUE';
    }

    query += ' ORDER BY level ASC, display_order ASC, name ASC';

    const [rows] = await this.pool.execute(query, params);
    const categories = rows as any[];

    return categories.map((row) => this.mapRowToCategory(row));
  }

  /**
   * Find all categories with pagination
   */
  async findAllWithPagination(
    options?: { includeInactive?: boolean; limit?: number; offset?: number }
  ): Promise<{ categories: Category[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];

    if (!options?.includeInactive) {
      whereClause = ' WHERE is_active = TRUE';
    }

    // Get total count
    const [countResult] = await this.pool.execute(
      `SELECT COUNT(*) as total FROM categories${whereClause}`,
      params
    );
    const total = (countResult as any[])[0]?.total || 0;

    // Get categories with pagination
    let query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
      ${whereClause}
      ORDER BY level ASC, display_order ASC, name ASC
    `;

    const limitValue = options?.limit !== undefined ? Math.max(0, Math.floor(options.limit)) : undefined;
    const offsetValue = options?.offset !== undefined ? Math.max(0, Math.floor(options.offset)) : undefined;

    if (limitValue !== undefined) {
      query += ` LIMIT ${limitValue}`;
      if (offsetValue !== undefined) {
        query += ` OFFSET ${offsetValue}`;
      }
    }

    const [rows] = await this.pool.execute(query, params);
    const categories = rows as any[];

    return { categories: categories.map((row) => this.mapRowToCategory(row)), total };
  }

  /**
   * Find categories by parent ID
   */
  async findByParentId(parentId?: string | null): Promise<Category[]> {
    const query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
      WHERE parent_id ${parentId ? '= ?' : 'IS NULL'}
      ORDER BY display_order ASC, name ASC
    `;

    const params = parentId ? [parentId] : [];
    const [rows] = await this.pool.execute(query, params);
    const categories = rows as any[];

    return categories.map((row) => this.mapRowToCategory(row));
  }

  /**
   * Find categories by level
   */
  async findByLevel(level: number): Promise<Category[]> {
    const query = `
      SELECT 
        id, name, slug, description, parent_id, level,
        display_order, is_active, created_at, updated_at
      FROM categories
      WHERE level = ? AND is_active = TRUE
      ORDER BY display_order ASC, name ASC
    `;

    const [rows] = await this.pool.execute(query, [level]);
    const categories = rows as any[];

    return categories.map((row) => this.mapRowToCategory(row));
  }

  /**
   * Build category tree (hierarchical structure)
   */
  async buildTree(options?: { includeInactive?: boolean }): Promise<CategoryTree[]> {
    const allCategories = await this.findAll(options);
    
    // Create a map for quick lookup
    const categoryMap = new Map<string, CategoryTree>();
    const roots: CategoryTree[] = [];

    // First pass: create all category nodes
    for (const category of allCategories) {
      categoryMap.set(category.id, { ...category, children: [] });
    }

    // Second pass: build tree structure
    for (const category of allCategories) {
      const node = categoryMap.get(category.id)!;
      
      if (!category.parentId) {
        // Root level
        roots.push(node);
      } else {
        // Child level
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      }
    }

    return roots;
  }

  /**
   * Check if a category is a descendant of another
   */
  private async isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
    let currentId: string | null = descendantId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        // Cycle detected
        break;
      }
      visited.add(currentId);

      if (currentId === ancestorId) {
        return true;
      }

      const category = await this.findById(currentId);
      if (!category || !category.parentId) {
        break;
      }

      currentId = category.parentId;
    }

    return false;
  }

  /**
   * Map database row to Category object
   */
  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || undefined,
      parentId: row.parent_id || undefined,
      level: row.level,
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Get the last modified timestamp of categories (for ETag generation)
   */
  static async getLastModifiedTimestamp(): Promise<string> {
    let connection;
    try {
      connection = await pool.getConnection();
      const [result] = await connection.execute(`
        SELECT MAX(updated_at) as last_modified
        FROM categories
      `);
      const lastModified = (result as any[])[0]?.last_modified;
      return lastModified ? new Date(lastModified).getTime().toString() : '0';
    } catch (error: any) {
      console.error('Error getting last modified timestamp for categories:', error);
      return Date.now().toString();
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}


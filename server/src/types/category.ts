export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  level: number; // 1, 2, 3, or 4
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[]; // For hierarchical responses
}

export interface CreateCategoryRequest {
  name: string;
  slug?: string; // Auto-generated from name if not provided
  description?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CategoryTree extends Category {
  children?: CategoryTree[];
}


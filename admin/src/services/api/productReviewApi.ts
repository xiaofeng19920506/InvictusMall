// Product Review API - Used by Products pages
import { api } from './client';
import type { ApiResponse } from './types';

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: string;
  updatedAt: string;
  // Reply fields
  reply?: string;
  replyBy?: string;
  replyAt?: string;
  // Joined fields
  userName?: string;
  userAvatar?: string;
  replyByName?: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export const productReviewApi = {
  // Get product reviews
  getProductReviews: async (
    productId: string,
    options?: {
      limit?: number;
      offset?: number;
      rating?: number;
      sortBy?: 'newest' | 'oldest' | 'helpful' | 'rating';
    }
  ): Promise<ApiResponse<ProductReview[]>> => {
    const params: any = {};
    if (options?.limit !== undefined) params.limit = options.limit;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.rating !== undefined) params.rating = options.rating;
    if (options?.sortBy) params.sortBy = options.sortBy;

    const response = await api.get(`/api/products/${productId}/reviews`, {
      params,
      withCredentials: true,
    });
    return response.data;
  },

  // Get product review statistics
  getReviewStats: async (productId: string): Promise<ApiResponse<ReviewStats>> => {
    const response = await api.get(`/api/products/${productId}/reviews/stats`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Delete review (admin only)
  deleteReview: async (reviewId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/api/reviews/${reviewId}`, {
      withCredentials: true,
    });
    return response.data;
  },

  // Reply to review (admin/store owner only)
  replyToReview: async (reviewId: string, reply: string): Promise<ApiResponse<ProductReview>> => {
    const response = await api.post(`/api/reviews/${reviewId}/reply`, {
      reply,
    }, {
      withCredentials: true,
    });
    return response.data;
  },
};


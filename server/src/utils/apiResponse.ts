/**
 * Standardized API response utilities
 * Ensures consistent response format across all endpoints
 */

import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
  total?: number;
  [key: string]: any;
}

export class ApiResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
    };

    if (message) {
      response.message = message;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send success response with count
   */
  static successWithCount<T>(
    res: Response,
    data: T[],
    count: number,
    message?: string,
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      count,
      ...(message && { message }),
    });
  }

  /**
   * Send success response with pagination
   */
  static successWithPagination<T>(
    res: Response,
    data: T[],
    total: number,
    message?: string,
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      data,
      count: data.length,
      total,
      ...(message && { message }),
    });
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    error?: string | Error | unknown
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
    };

    if (error) {
      response.error = error instanceof Error ? error.message : (typeof error === 'string' ? error : String(error));
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      response.stack = error.stack;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    message: string,
    errors?: any
  ): Response {
    const response: ApiResponse = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(400).json(response);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, resource: string = 'Resource'): Response {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`,
    });
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return res.status(401).json({
      success: false,
      message,
    });
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden'): Response {
    return res.status(403).json({
      success: false,
      message,
    });
  }
}


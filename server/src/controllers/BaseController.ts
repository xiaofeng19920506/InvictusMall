import { Response } from "express";
import { ApiResponseHelper } from "../utils/apiResponse";
import { logger } from "../utils/logger";

/**
 * Base controller class that provides common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Send success response with data
   */
  protected success<T>(res: Response, data: T, message?: string, statusCode: number = 200): Response {
    return ApiResponseHelper.success(res, data, message, statusCode);
  }

  /**
   * Send success response with count
   */
  protected successWithCount<T>(res: Response, data: T[], count: number, message?: string): Response {
    return ApiResponseHelper.successWithCount(res, data, count, message);
  }

  /**
   * Send success response with pagination
   */
  protected successWithPagination<T>(
    res: Response,
    data: T[],
    total: number,
    message?: string
  ): Response {
    return ApiResponseHelper.successWithPagination(res, data, total, message);
  }

  /**
   * Send error response
   */
  protected error(res: Response, message: string, statusCode: number = 500, error?: any): Response {
    return ApiResponseHelper.error(res, message, statusCode, error);
  }

  /**
   * Send unauthorized response
   */
  protected unauthorized(res: Response, message: string = "Unauthorized"): Response {
    return ApiResponseHelper.unauthorized(res, message);
  }

  /**
   * Send not found response
   */
  protected notFound(res: Response, resource: string): Response {
    return ApiResponseHelper.notFound(res, resource);
  }

  /**
   * Send validation error response
   */
  protected validationError(res: Response, message: string, errors?: { [key: string]: string }): Response {
    return ApiResponseHelper.validationError(res, message, errors);
  }

  /**
   * Handle async errors consistently
   */
  protected async handleAsync<T>(
    res: Response,
    operation: () => Promise<T>,
    errorMessage: string,
    context?: Record<string, any>
  ): Promise<Response | void> {
    try {
      const result = await operation();
      return res.status(200).json(result);
    } catch (error) {
      logger.error(errorMessage, error, context);
      return this.error(res, errorMessage, 500, error);
    }
  }
}


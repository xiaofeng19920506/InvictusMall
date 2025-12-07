import { Router, Request, Response } from 'express';
import { ProductQuestionModel, CreateQuestionRequest, CreateAnswerRequest } from '../models/ProductQuestionModel';
import { authenticateUserToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiResponseHelper } from '../utils/apiResponse';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Get questions for a product
 */
router.get('/products/:productId/questions', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { limit, offset } = req.query;

    if (!productId) {
      return ApiResponseHelper.validationError(res, 'Product ID is required');
    }

    const options: any = {};
    if (limit) options.limit = parseInt(limit as string);
    if (offset) options.offset = parseInt(offset as string);

    const result = await ProductQuestionModel.findByProductId(productId, options);

    return ApiResponseHelper.successWithPagination(res, result.questions, result.total);
  } catch (error) {
    logger.error('Failed to get product questions', error);
    return ApiResponseHelper.error(res, 'Failed to get product questions', 500, error);
  }
});

/**
 * Create a question
 */
router.post('/products/:productId/questions', authenticateUserToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { question } = req.body;
    const userId = req.user!.id;

    if (!productId) {
      return ApiResponseHelper.validationError(res, 'Product ID is required');
    }

    if (!question || !question.trim()) {
      return ApiResponseHelper.validationError(res, 'Question is required');
    }

    const data: CreateQuestionRequest = {
      productId,
      userId,
      question: question.trim(),
    };

    const createdQuestion = await ProductQuestionModel.create(data);

    return ApiResponseHelper.success(res, createdQuestion, 'Question created successfully', 201);
  } catch (error) {
    logger.error('Failed to create question', error);
    return ApiResponseHelper.error(res, 'Failed to create question', 500, error);
  }
});

/**
 * Create an answer
 */
router.post('/questions/:questionId/answers', authenticateUserToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const { answer, isSellerAnswer } = req.body;
    const userId = req.user!.id;

    if (!questionId) {
      return ApiResponseHelper.validationError(res, 'Question ID is required');
    }

    if (!answer || !answer.trim()) {
      return ApiResponseHelper.validationError(res, 'Answer is required');
    }

    const data: CreateAnswerRequest = {
      questionId,
      userId,
      answer: answer.trim(),
      isSellerAnswer: isSellerAnswer || false,
    };

    const createdAnswer = await ProductQuestionModel.createAnswer(data);

    return ApiResponseHelper.success(res, createdAnswer, 'Answer created successfully', 201);
  } catch (error) {
    logger.error('Failed to create answer', error);
    return ApiResponseHelper.error(res, 'Failed to create answer', 500, error);
  }
});

/**
 * Mark question as helpful
 */
router.post('/questions/:questionId/helpful', async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return ApiResponseHelper.validationError(res, 'Question ID is required');
    }

    await ProductQuestionModel.markQuestionHelpful(questionId);

    return ApiResponseHelper.success(res, null, 'Question marked as helpful');
  } catch (error) {
    logger.error('Failed to mark question as helpful', error);
    return ApiResponseHelper.error(res, 'Failed to mark question as helpful', 500, error);
  }
});

/**
 * Mark answer as helpful
 */
router.post('/answers/:answerId/helpful', async (req: Request, res: Response) => {
  try {
    const { answerId } = req.params;

    if (!answerId) {
      return ApiResponseHelper.validationError(res, 'Answer ID is required');
    }

    await ProductQuestionModel.markAnswerHelpful(answerId);

    return ApiResponseHelper.success(res, null, 'Answer marked as helpful');
  } catch (error) {
    logger.error('Failed to mark answer as helpful', error);
    return ApiResponseHelper.error(res, 'Failed to mark answer as helpful', 500, error);
  }
});

export default router;



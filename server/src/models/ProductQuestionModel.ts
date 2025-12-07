import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface ProductQuestion {
  id: string;
  productId: string;
  userId: string;
  question: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  answers?: ProductAnswer[];
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ProductAnswer {
  id: string;
  questionId: string;
  userId: string;
  answer: string;
  isSellerAnswer: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateQuestionRequest {
  productId: string;
  userId: string;
  question: string;
}

export interface CreateAnswerRequest {
  questionId: string;
  userId: string;
  answer: string;
  isSellerAnswer?: boolean;
}

export class ProductQuestionModel {
  // Get questions for a product
  static async findByProductId(productId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ questions: ProductQuestion[]; total: number }> {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get total count
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM product_questions WHERE product_id = ?`,
        [productId]
      );
      const total = (countResult as any[])[0]?.total || 0;
      
      // Get questions with user info
      const limit = options?.limit || 20;
      const offset = options?.offset || 0;
      
      const [rows] = await connection.execute(
        `SELECT q.*, u.first_name, u.last_name
         FROM product_questions q
         LEFT JOIN users u ON q.user_id = u.id
         WHERE q.product_id = ?
         ORDER BY q.helpful_count DESC, q.created_at DESC
         LIMIT ? OFFSET ?`,
        [productId, limit, offset]
      );
      
      const questions = rows as any[];
      if (!questions || questions.length === 0) {
        return { questions: [], total };
      }
      
      const questionIds = questions.map((q: any) => q.id);
      
      // Get answers for these questions
      const [answerRows] = await connection.execute(
        `SELECT a.*, u.first_name, u.last_name
         FROM product_answers a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.question_id IN (${questionIds.map(() => '?').join(',')})
         ORDER BY a.is_seller_answer DESC, a.helpful_count DESC, a.created_at ASC`,
        questionIds
      );
      
      const answers = answerRows as any[];
      const answersByQuestionId: { [key: string]: ProductAnswer[] } = {};
      
      answers.forEach((a: any) => {
        if (!answersByQuestionId[a.question_id]) {
          answersByQuestionId[a.question_id] = [];
        }
        const answerArray = answersByQuestionId[a.question_id]!;
        answerArray.push({
          id: a.id,
          questionId: a.question_id,
          userId: a.user_id,
          answer: a.answer,
          isSellerAnswer: Boolean(a.is_seller_answer),
          helpfulCount: a.helpful_count,
          createdAt: new Date(a.created_at),
          updatedAt: new Date(a.updated_at),
          user: a.first_name ? {
            id: a.user_id,
            firstName: a.first_name,
            lastName: a.last_name,
          } : undefined,
        });
      });
      
      const result: ProductQuestion[] = questions.map((q: any) => ({
        id: q.id,
        productId: q.product_id,
        userId: q.user_id,
        question: q.question,
        helpfulCount: q.helpful_count,
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
        answers: answersByQuestionId[q.id] || [],
        user: q.first_name ? {
          id: q.user_id,
          firstName: q.first_name,
          lastName: q.last_name,
        } : undefined,
      }));
      
      return { questions: result, total };
    } catch (error: any) {
      logger.error('Database error in findByProductId', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  // Create a question
  static async create(data: CreateQuestionRequest): Promise<ProductQuestion> {
    let connection;
    try {
      connection = await pool.getConnection();
      const questionId = uuidv4();
      const now = new Date();
      
      await connection.execute(
        `INSERT INTO product_questions (id, product_id, user_id, question, helpful_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [questionId, data.productId, data.userId, data.question, now, now]
      );
      
      return {
        id: questionId,
        productId: data.productId,
        userId: data.userId,
        question: data.question,
        helpfulCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Database error in create', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  // Create an answer
  static async createAnswer(data: CreateAnswerRequest): Promise<ProductAnswer> {
    let connection;
    try {
      connection = await pool.getConnection();
      const answerId = uuidv4();
      const now = new Date();
      
      await connection.execute(
        `INSERT INTO product_answers (id, question_id, user_id, answer, is_seller_answer, helpful_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [answerId, data.questionId, data.userId, data.answer, data.isSellerAnswer || false, now, now]
      );
      
      return {
        id: answerId,
        questionId: data.questionId,
        userId: data.userId,
        answer: data.answer,
        isSellerAnswer: data.isSellerAnswer || false,
        helpfulCount: 0,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error: any) {
      logger.error('Database error in createAnswer', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  // Mark question as helpful
  static async markQuestionHelpful(questionId: string): Promise<void> {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.execute(
        `UPDATE product_questions SET helpful_count = helpful_count + 1 WHERE id = ?`,
        [questionId]
      );
    } catch (error: any) {
      logger.error('Database error in markQuestionHelpful', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
  
  // Mark answer as helpful
  static async markAnswerHelpful(answerId: string): Promise<void> {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.execute(
        `UPDATE product_answers SET helpful_count = helpful_count + 1 WHERE id = ?`,
        [answerId]
      );
    } catch (error: any) {
      logger.error('Database error in markAnswerHelpful', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}



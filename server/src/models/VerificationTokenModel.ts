import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface VerificationToken {
  id: string;
  userId: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface CreateVerificationTokenRequest {
  userId: string;
  token: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
}

export class VerificationTokenModel {
  private pool = pool;

  async createToken(tokenData: CreateVerificationTokenRequest): Promise<VerificationToken> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO verification_tokens (
        id, user_id, token, type, expires_at, used, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      tokenData.userId,
      tokenData.token,
      tokenData.type,
      tokenData.expiresAt,
      false,
      now
    ];

    await this.pool.execute(query, values);

    return this.getTokenById(id);
  }

  async getTokenById(id: string): Promise<VerificationToken> {
    const query = `
      SELECT id, user_id, token, type, expires_at, used, created_at
      FROM verification_tokens
      WHERE id = ?
    `;

    const [rows] = await this.pool.execute(query, [id]);
    const tokens = rows as any[];

    if (tokens.length === 0) {
      throw new Error('Verification token not found');
    }

    const token = tokens[0];
    return {
      id: token.id,
      userId: token.user_id,
      token: token.token,
      type: token.type,
      expiresAt: token.expires_at,
      used: token.used,
      createdAt: token.created_at
    };
  }

  async getTokenByTokenValue(tokenValue: string): Promise<VerificationToken | null> {
    const query = `
      SELECT id, user_id, token, type, expires_at, used, created_at
      FROM verification_tokens
      WHERE token = ? AND used = false
    `;

    const [rows] = await this.pool.execute(query, [tokenValue]);
    const tokens = rows as any[];

    if (tokens.length === 0) {
      return null;
    }

    const token = tokens[0];
    return {
      id: token.id,
      userId: token.user_id,
      token: token.token,
      type: token.type,
      expiresAt: token.expires_at,
      used: token.used,
      createdAt: token.created_at
    };
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    const query = `
      UPDATE verification_tokens
      SET used = true
      WHERE id = ?
    `;

    await this.pool.execute(query, [tokenId]);
  }

  async deleteExpiredTokens(): Promise<void> {
    const query = `
      DELETE FROM verification_tokens
      WHERE expires_at < NOW()
    `;

    await this.pool.execute(query);
  }

  async createVerificationTokensTable(): Promise<void> {
    // Create table without foreign key first
    const query = `
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        type ENUM('email_verification', 'password_reset') NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token),
        INDEX idx_type (type),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.pool.execute(query);

    // Try to add foreign key constraint (may fail if user lacks REFERENCES permission)
    try {
      await this.pool.execute(`
        ALTER TABLE verification_tokens
        ADD CONSTRAINT fk_verification_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error: any) {
      // Silently ignore if foreign key already exists or user lacks REFERENCES permission
      if (error?.code !== 'ER_DUP_KEY' && error?.code !== 'ER_FK_DUP_NAME' && error?.errno !== 1142 && error?.code !== 'ER_TABLEACCESS_DENIED_ERROR') {
        console.warn('Could not add foreign key to verification_tokens:', error.message);
      }
      // Log when REFERENCES permission is missing (but don't fail)
      if (error?.errno === 1142 || error?.code === 'ER_TABLEACCESS_DENIED_ERROR') {
        console.info('Skipping foreign key constraint for verification_tokens (missing REFERENCES permission)');
      }
    }
  }
}

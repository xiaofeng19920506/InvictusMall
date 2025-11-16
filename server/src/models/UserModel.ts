import { Pool } from "mysql2/promise";
import { pool } from "../config/database";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  email: string;
  password?: string; // Optional for unverified users
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: "customer";
  isActive: boolean;
  emailVerified: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface SetupPasswordRequest {
  token: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: Omit<User, "password">;
  token?: string;
  message?: string;
}

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Delete unactivated user accounts older than specified days
   * An account is considered unactivated if:
   * - is_active = false OR
   * - email_verified = false OR
   * - password IS NULL
   * @param daysOld - Number of days old the account should be (default: 7)
   * @returns Number of accounts deleted
   */
  async deleteUnactivatedAccounts(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const query = `
        DELETE FROM users
        WHERE created_at < ?
        AND (
          is_active = false
          OR email_verified = false
          OR password IS NULL
        )
      `;

      const [result] = await this.pool.execute(query, [cutoffDate]);
      const deleteResult = result as any;
      return deleteResult.affectedRows || 0;
    } catch (error: any) {
      console.error("Error deleting unactivated accounts:", error);
      throw error;
    }
  }

  /**
   * Get count of unactivated accounts older than specified days
   * @param daysOld - Number of days old the account should be (default: 7)
   * @returns Count of unactivated accounts
   */
  async countUnactivatedAccounts(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const query = `
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at < ?
        AND (
          is_active = false
          OR email_verified = false
          OR password IS NULL
        )
      `;

      const [rows] = await this.pool.execute(query, [cutoffDate]);
      const result = rows as any[];
      return result[0]?.count || 0;
    } catch (error: any) {
      console.error("Error counting unactivated accounts:", error);
      throw error;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO users (
        id, email, password, first_name, last_name, phone_number, role, 
        is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      userData.email.toLowerCase(),
      null, // No password initially - will be set after email verification
      userData.firstName,
      userData.lastName,
      userData.phoneNumber,
      "customer", // Always set to customer
      false, // Inactive until email is verified
      false, // Email not verified yet
      now,
      now,
    ];

    await this.pool.execute(query, values);

    return this.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, password, first_name, last_name, phone_number, role, 
               is_active, email_verified, avatar, created_at, updated_at, last_login_at
        FROM users 
        WHERE email = ? AND is_active = true
      `;

      const [rows] = await this.pool.execute(query, [email.toLowerCase()]);
      const users = rows as any[];

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      return {
        id: user.id,
        email: user.email,
        password: user.password,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        avatar: user.avatar || undefined,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
      };
    } catch (error: any) {
      console.error("Database error in getUserByEmail:", error);
      // Re-throw database errors so they can be handled by the route
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    const query = `
      SELECT id, email, password, first_name, last_name, phone_number, role, 
             is_active, email_verified, avatar, created_at, updated_at, last_login_at
      FROM users 
      WHERE id = ?
    `;

    const [rows] = await this.pool.execute(query, [id]);
    const users = rows as any[];

    if (users.length === 0) {
      throw new Error("User not found");
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      avatar: user.avatar || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    };
  }

  async getActiveUserById(id: string): Promise<User> {
    const query = `
      SELECT id, email, password, first_name, last_name, phone_number, role, 
             is_active, email_verified, avatar, created_at, updated_at, last_login_at
      FROM users 
      WHERE id = ? AND is_active = true
    `;

    const [rows] = await this.pool.execute(query, [id]);
    const users = rows as any[];

    if (users.length === 0) {
      throw new Error("User not found");
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      avatar: user.avatar || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    };
  }

  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async emailExists(email: string): Promise<boolean> {
    const query = "SELECT id FROM users WHERE email = ?";
    const [rows] = await this.pool.execute(query, [email.toLowerCase()]);
    const users = rows as any[];
    return users.length > 0;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login_at = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date();
    await this.pool.execute(query, [now, now, userId]);
  }

  async setupPassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const query = `
      UPDATE users 
      SET password = ?, email_verified = true, is_active = true, updated_at = ?
      WHERE id = ?
    `;

    await this.pool.execute(query, [hashedPassword, now, userId]);
  }

  async updatePassword(userId: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const query = `
      UPDATE users 
      SET password = ?, updated_at = ?
      WHERE id = ?
    `;

    await this.pool.execute(query, [hashedPassword, now, userId]);
  }

  async verifyEmail(userId: string): Promise<void> {
    const now = new Date();

    const query = `
      UPDATE users 
      SET email_verified = true, updated_at = ?
      WHERE id = ?
    `;

    await this.pool.execute(query, [now, userId]);
  }

  async getUserByEmailUnverified(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password, first_name, last_name, phone_number, role, 
             is_active, email_verified, avatar, created_at, updated_at, last_login_at
      FROM users 
      WHERE email = ?
    `;

    const [rows] = await this.pool.execute(query, [email.toLowerCase()]);
    const users = rows as any[];

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      avatar: user.avatar || undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at,
    };
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phoneNumber?: string }
  ): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.firstName !== undefined) {
      updates.push("first_name = ?");
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push("last_name = ?");
      values.push(data.lastName);
    }
    if (data.phoneNumber !== undefined) {
      updates.push("phone_number = ?");
      values.push(data.phoneNumber);
    }

    if (updates.length === 0) {
      return this.getUserById(userId);
    }

    updates.push("updated_at = ?");
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await this.pool.execute(query, values);
    return this.getUserById(userId);
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const query = `
      UPDATE users 
      SET avatar = ?, updated_at = ?
      WHERE id = ?
    `;

    const now = new Date();
    await this.pool.execute(query, [avatarUrl, now, userId]);
    return this.getUserById(userId);
  }

  async createUsersTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        role ENUM('customer') DEFAULT 'customer',
        is_active BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        avatar VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await this.pool.execute(query);
  }
}

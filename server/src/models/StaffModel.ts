import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface Staff {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  storeId?: string; // Store ID for store owners/managers/employees
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
}

export interface CreateStaffRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  storeId?: string;
  createdBy?: string;
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  isActive?: boolean;
}

export class StaffModel {
  async createStaff(staffData: CreateStaffRequest): Promise<Staff> {
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(staffData.password, 12);
    const now = new Date();

    const query = `
      INSERT INTO staff (
        id, email, password, first_name, last_name, phone_number, 
        role, department, employee_id, store_id, is_active, email_verified, 
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id,
      staffData.email,
      hashedPassword,
      staffData.firstName,
      staffData.lastName,
      staffData.phoneNumber,
      staffData.role,
      staffData.department || null,
      staffData.employeeId || null,
      staffData.storeId || null,
      true, // Staff are active by default
      true, // Staff emails are verified by default
      now,
      now,
      staffData.createdBy || null
    ]);

    const staff = await this.getStaffById(id);
    if (!staff) {
      throw new Error('Failed to create staff member');
    }
    return staff;
  }

  async getStaffById(id: string): Promise<Staff | null> {
    // Admin doesn't need isActive check, other roles must be active
    const query = `
      SELECT 
        id, email, first_name, last_name, phone_number, role, 
        department, employee_id, store_id, is_active, email_verified, 
        created_at, updated_at, last_login_at, created_by
      FROM staff 
      WHERE id = ? AND (role = 'admin' OR is_active = true)
    `;

    const [rows] = await pool.execute(query, [id]);
    const staffArray = rows as any[];

    if (staffArray.length === 0) {
      return null;
    }

    const staff = staffArray[0];
    return {
      id: staff.id,
      email: staff.email,
      firstName: staff.first_name,
      lastName: staff.last_name,
      phoneNumber: staff.phone_number,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      storeId: staff.store_id || undefined,
      isActive: staff.is_active,
      emailVerified: staff.email_verified,
      createdAt: staff.created_at,
      updatedAt: staff.updated_at,
      lastLoginAt: staff.last_login_at,
      createdBy: staff.created_by
    };
  }

  async getStaffByEmail(email: string): Promise<Staff | null> {
    // Admin doesn't need isActive check, other roles must be active
    const query = `
      SELECT 
        id, email, password, first_name, last_name, phone_number, role, 
        department, employee_id, store_id, is_active, email_verified, 
        created_at, updated_at, last_login_at, created_by
      FROM staff 
      WHERE email = ? AND (role = 'admin' OR is_active = true)
    `;

    const [rows] = await pool.execute(query, [email]);
    const staffArray = rows as any[];

    if (staffArray.length === 0) {
      return null;
    }

    const staff = staffArray[0];
    return {
      id: staff.id,
      email: staff.email,
      password: staff.password,
      firstName: staff.first_name,
      lastName: staff.last_name,
      phoneNumber: staff.phone_number,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      storeId: staff.store_id || undefined,
      isActive: staff.is_active,
      emailVerified: staff.email_verified,
      createdAt: staff.created_at,
      updatedAt: staff.updated_at,
      lastLoginAt: staff.last_login_at,
      createdBy: staff.created_by
    };
  }

  async getAllStaff(): Promise<Staff[]> {
    // Admin doesn't need isActive check, other roles must be active
    const query = `
      SELECT 
        id, email, first_name, last_name, phone_number, role, 
        department, employee_id, store_id, is_active, email_verified, 
        created_at, updated_at, last_login_at, created_by
      FROM staff 
      WHERE role = 'admin' OR is_active = true
      ORDER BY created_at DESC
    `;

    const [rows] = await pool.execute(query);
    const staffArray = rows as any[];

    return staffArray.map(staff => ({
      id: staff.id,
      email: staff.email,
      firstName: staff.first_name,
      lastName: staff.last_name,
      phoneNumber: staff.phone_number,
      role: staff.role,
      department: staff.department,
      employeeId: staff.employee_id,
      storeId: staff.store_id || undefined,
      isActive: staff.is_active,
      emailVerified: staff.email_verified,
      createdAt: staff.created_at,
      updatedAt: staff.updated_at,
      lastLoginAt: staff.last_login_at,
      createdBy: staff.created_by
    }));
  }

  async getAllStaffWithPagination(options?: { limit?: number; offset?: number }): Promise<{ staff: Staff[]; total: number }> {
    // Get total count
    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM staff 
      WHERE role = 'admin' OR is_active = true
    `);
    const total = (countResult as any[])[0]?.total || 0;

    // Get staff with pagination
    let query = `
      SELECT 
        id, email, first_name, last_name, phone_number, role, 
        department, employee_id, store_id, is_active, email_verified, 
        created_at, updated_at, last_login_at, created_by
      FROM staff 
      WHERE role = 'admin' OR is_active = true
      ORDER BY created_at DESC
    `;

    const limitValue = options?.limit !== undefined ? Math.max(0, Math.floor(options.limit)) : undefined;
    const offsetValue = options?.offset !== undefined ? Math.max(0, Math.floor(options.offset)) : undefined;

    if (limitValue !== undefined) {
      query += ` LIMIT ${limitValue}`;
      if (offsetValue !== undefined) {
        query += ` OFFSET ${offsetValue}`;
      }
    }

    const [rows] = await pool.execute(query);
    const staffArray = rows as any[];

    return {
      staff: staffArray.map(staff => ({
        id: staff.id,
        email: staff.email,
        firstName: staff.first_name,
        lastName: staff.last_name,
        phoneNumber: staff.phone_number,
        role: staff.role,
        department: staff.department,
        employeeId: staff.employee_id,
        storeId: staff.store_id || undefined,
        isActive: staff.is_active,
        emailVerified: staff.email_verified,
        createdAt: staff.created_at,
        updatedAt: staff.updated_at,
        lastLoginAt: staff.last_login_at,
        createdBy: staff.created_by
      })),
      total
    };
  }

  async updateStaff(id: string, updateData: UpdateStaffRequest): Promise<Staff | null> {
    const fields = [];
    const values = [];

    if (updateData.firstName !== undefined) {
      fields.push('first_name = ?');
      values.push(updateData.firstName);
    }
    if (updateData.lastName !== undefined) {
      fields.push('last_name = ?');
      values.push(updateData.lastName);
    }
    if (updateData.phoneNumber !== undefined) {
      fields.push('phone_number = ?');
      values.push(updateData.phoneNumber);
    }
    if (updateData.role !== undefined) {
      fields.push('role = ?');
      values.push(updateData.role);
    }
    if (updateData.department !== undefined) {
      fields.push('department = ?');
      values.push(updateData.department);
    }
    if (updateData.employeeId !== undefined) {
      fields.push('employee_id = ?');
      values.push(updateData.employeeId);
    }
    if (updateData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.isActive);
    }

    if (fields.length === 0) {
      return this.getStaffById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date());
    values.push(id);

    const query = `UPDATE staff SET ${fields.join(', ')} WHERE id = ?`;

    await pool.execute(query, values);
    return this.getStaffById(id);
  }

  async updatePassword(id: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();

    const query = `
      UPDATE staff 
      SET password = ?, updated_at = ?
      WHERE id = ?
    `;

    await pool.execute(query, [hashedPassword, now, id]);
  }

  async updateLastLogin(id: string): Promise<void> {
    const now = new Date();
    const query = `UPDATE staff SET last_login_at = ? WHERE id = ?`;
    await pool.execute(query, [now, id]);
  }

  async deleteStaff(id: string): Promise<void> {
    // Soft delete by setting is_active to false
    const query = `UPDATE staff SET is_active = false, updated_at = ? WHERE id = ?`;
    await pool.execute(query, [new Date(), id]);
  }

  async verifyPassword(staff: Staff, password: string): Promise<boolean> {
    if (!staff.password) {
      return false;
    }
    return bcrypt.compare(password, staff.password);
  }

  async emailExists(email: string): Promise<boolean> {
    const query = `SELECT id FROM staff WHERE email = ?`;
    const [rows] = await pool.execute(query, [email]);
    return (rows as any[]).length > 0;
  }

  async employeeIdExists(employeeId: string): Promise<boolean> {
    const query = `SELECT id FROM staff WHERE employee_id = ?`;
    const [rows] = await pool.execute(query, [employeeId]);
    return (rows as any[]).length > 0;
  }
}

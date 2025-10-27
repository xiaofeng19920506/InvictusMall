import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface StaffInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'owner' | 'manager' | 'employee';
  department?: string;
  employeeId?: string;
  invitedBy: string;
}

export class StaffInvitationModel {
  async createInvitation(invitationData: CreateInvitationRequest): Promise<StaffInvitation> {
    const id = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    const now = new Date();

    const query = `
      INSERT INTO staff_invitations (
        id, email, first_name, last_name, role, department, employee_id,
        token, invited_by, expires_at, is_used, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id,
      invitationData.email.toLowerCase(),
      invitationData.firstName,
      invitationData.lastName,
      invitationData.role,
      invitationData.department || null,
      invitationData.employeeId || null,
      token,
      invitationData.invitedBy,
      expiresAt,
      false,
      now,
      now
    ]);

    const invitation = await this.getInvitationById(id);
    if (!invitation) {
      throw new Error('Failed to create invitation');
    }
    return invitation;
  }

  async getInvitationById(id: string): Promise<StaffInvitation | null> {
    const query = `
      SELECT 
        id, email, first_name, last_name, role, department, employee_id,
        token, invited_by, expires_at, is_used, created_at, updated_at
      FROM staff_invitations 
      WHERE id = ?
    `;

    const [rows] = await pool.execute(query, [id]);
    const invitationArray = rows as any[];

    if (invitationArray.length === 0) {
      return null;
    }

    const invitation = invitationArray[0];
    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      role: invitation.role,
      department: invitation.department,
      employeeId: invitation.employee_id,
      token: invitation.token,
      invitedBy: invitation.invited_by,
      expiresAt: invitation.expires_at,
      isUsed: invitation.is_used,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at
    };
  }

  async getInvitationByToken(token: string): Promise<StaffInvitation | null> {
    const query = `
      SELECT 
        id, email, first_name, last_name, role, department, employee_id,
        token, invited_by, expires_at, is_used, created_at, updated_at
      FROM staff_invitations 
      WHERE token = ? AND is_used = false AND expires_at > NOW()
    `;

    const [rows] = await pool.execute(query, [token]);
    const invitationArray = rows as any[];

    if (invitationArray.length === 0) {
      return null;
    }

    const invitation = invitationArray[0];
    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      role: invitation.role,
      department: invitation.department,
      employeeId: invitation.employee_id,
      token: invitation.token,
      invitedBy: invitation.invited_by,
      expiresAt: invitation.expires_at,
      isUsed: invitation.is_used,
      createdAt: invitation.created_at,
      updatedAt: invitation.updated_at
    };
  }

  async markInvitationAsUsed(token: string): Promise<void> {
    const query = `UPDATE staff_invitations SET is_used = true, updated_at = NOW() WHERE token = ?`;
    await pool.execute(query, [token]);
  }

  async deleteExpiredInvitations(): Promise<void> {
    const query = `DELETE FROM staff_invitations WHERE expires_at < NOW() OR is_used = true`;
    await pool.execute(query);
  }
}

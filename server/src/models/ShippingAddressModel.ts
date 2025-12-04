import { Pool } from "mysql2/promise";
import { pool } from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface ShippingAddress {
  id: string;
  userId: string;
  label?: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShippingAddressRequest {
  label?: string;
  fullName: string;
  phoneNumber: string;
  streetAddress: string;
  aptNumber?: string;
  city: string;
  stateProvince: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateShippingAddressRequest {
  label?: string;
  fullName?: string;
  phoneNumber?: string;
  streetAddress?: string;
  aptNumber?: string;
  city?: string;
  stateProvince?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

export class ShippingAddressModel {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new shipping address for a user
   */
  async createAddress(
    userId: string,
    addressData: CreateShippingAddressRequest
  ): Promise<ShippingAddress> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // If this is set as default, unset other default addresses
      if (addressData.isDefault) {
        await connection.execute(
          `UPDATE shipping_addresses 
           SET is_default = false 
           WHERE user_id = ?`,
          [userId]
        );
      }

      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO shipping_addresses (
          id, user_id, label, full_name, phone_number, street_address, 
          apt_number, city, state_province, zip_code, country, 
          is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        id,
        userId,
        // Convert empty string to null to avoid storing empty strings
        addressData.label && addressData.label.trim() ? addressData.label.trim() : null,
        addressData.fullName,
        addressData.phoneNumber,
        addressData.streetAddress,
        addressData.aptNumber || null,
        addressData.city,
        addressData.stateProvince,
        addressData.zipCode,
        addressData.country,
        addressData.isDefault || false,
        now,
        now,
      ]);

      await connection.commit();

      return this.getAddressById(id);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all shipping addresses for a user
   * Returns addresses in creation order (oldest first)
   */
  async getAddressesByUserId(userId: string): Promise<ShippingAddress[]> {
    const query = `
      SELECT 
        id, user_id, label, full_name, phone_number, street_address, 
        apt_number, city, state_province, zip_code, country, 
        is_default, created_at, updated_at
      FROM shipping_addresses
      WHERE user_id = ?
      ORDER BY created_at ASC
    `;

    const [rows] = await this.pool.execute(query, [userId]);
    const addresses = rows as any[];

    return addresses.map((addr) => ({
      id: addr.id,
      userId: addr.user_id,
      label: addr.label || undefined,
      fullName: addr.full_name,
      phoneNumber: addr.phone_number,
      streetAddress: addr.street_address,
      aptNumber: addr.apt_number || undefined,
      city: addr.city,
      stateProvince: addr.state_province,
      zipCode: addr.zip_code,
      country: addr.country,
      isDefault: addr.is_default,
      createdAt: addr.created_at,
      updatedAt: addr.updated_at,
    }));
  }

  /**
   * Get a specific shipping address by ID
   */
  async getAddressById(addressId: string): Promise<ShippingAddress> {
    const query = `
      SELECT 
        id, user_id, label, full_name, phone_number, street_address, 
        apt_number, city, state_province, zip_code, country, 
        is_default, created_at, updated_at
      FROM shipping_addresses
      WHERE id = ?
    `;

    const [rows] = await this.pool.execute(query, [addressId]);
    const addresses = rows as any[];

    if (addresses.length === 0) {
      throw new Error("Shipping address not found");
    }

    const addr = addresses[0];
    return {
      id: addr.id,
      userId: addr.user_id,
      // Only include label if it's a non-empty string
      label: addr.label && typeof addr.label === 'string' && addr.label.trim().length > 0 ? addr.label.trim() : undefined,
      fullName: addr.full_name,
      phoneNumber: addr.phone_number,
      streetAddress: addr.street_address,
      aptNumber: addr.apt_number || undefined,
      city: addr.city,
      stateProvince: addr.state_province,
      zipCode: addr.zip_code,
      country: addr.country,
      isDefault: addr.is_default,
      createdAt: addr.created_at,
      updatedAt: addr.updated_at,
    };
  }

  /**
   * Get default shipping address for a user
   */
  async getDefaultAddress(userId: string): Promise<ShippingAddress | null> {
    const query = `
      SELECT 
        id, user_id, label, full_name, phone_number, street_address, 
        apt_number, city, state_province, zip_code, country, 
        is_default, created_at, updated_at
      FROM shipping_addresses
      WHERE user_id = ? AND is_default = true
      LIMIT 1
    `;

    const [rows] = await this.pool.execute(query, [userId]);
    const addresses = rows as any[];

    if (addresses.length === 0) {
      return null;
    }

    const addr = addresses[0];
    return {
      id: addr.id,
      userId: addr.user_id,
      // Only include label if it's a non-empty string
      label: addr.label && typeof addr.label === 'string' && addr.label.trim().length > 0 ? addr.label.trim() : undefined,
      fullName: addr.full_name,
      phoneNumber: addr.phone_number,
      streetAddress: addr.street_address,
      aptNumber: addr.apt_number || undefined,
      city: addr.city,
      stateProvince: addr.state_province,
      zipCode: addr.zip_code,
      country: addr.country,
      isDefault: addr.is_default,
      createdAt: addr.created_at,
      updatedAt: addr.updated_at,
    };
  }

  /**
   * Update a shipping address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    addressData: UpdateShippingAddressRequest
  ): Promise<ShippingAddress> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify the address belongs to the user
      const existingAddress = await this.getAddressById(addressId);
      if (existingAddress.userId !== userId) {
        throw new Error("Unauthorized: Address does not belong to user");
      }

      // If setting as default, unset other default addresses
      if (addressData.isDefault === true) {
        await connection.execute(
          `UPDATE shipping_addresses 
           SET is_default = false 
           WHERE user_id = ? AND id != ?`,
          [userId, addressId]
        );
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (addressData.label !== undefined) {
        updateFields.push("label = ?");
        // Convert empty string to null to avoid storing empty strings
        updateValues.push(addressData.label && addressData.label.trim() ? addressData.label.trim() : null);
      }
      if (addressData.fullName !== undefined) {
        updateFields.push("full_name = ?");
        updateValues.push(addressData.fullName);
      }
      if (addressData.phoneNumber !== undefined) {
        updateFields.push("phone_number = ?");
        updateValues.push(addressData.phoneNumber);
      }
      if (addressData.streetAddress !== undefined) {
        updateFields.push("street_address = ?");
        updateValues.push(addressData.streetAddress);
      }
      if (addressData.aptNumber !== undefined) {
        updateFields.push("apt_number = ?");
        updateValues.push(addressData.aptNumber || null);
      }
      if (addressData.city !== undefined) {
        updateFields.push("city = ?");
        updateValues.push(addressData.city);
      }
      if (addressData.stateProvince !== undefined) {
        updateFields.push("state_province = ?");
        updateValues.push(addressData.stateProvince);
      }
      if (addressData.zipCode !== undefined) {
        updateFields.push("zip_code = ?");
        updateValues.push(addressData.zipCode);
      }
      if (addressData.country !== undefined) {
        updateFields.push("country = ?");
        updateValues.push(addressData.country);
      }
      if (addressData.isDefault !== undefined) {
        updateFields.push("is_default = ?");
        updateValues.push(addressData.isDefault);
      }

      if (updateFields.length === 0) {
        return existingAddress;
      }

      updateFields.push("updated_at = ?");
      updateValues.push(new Date());
      updateValues.push(addressId);
      updateValues.push(userId);

      const query = `
        UPDATE shipping_addresses
        SET ${updateFields.join(", ")}
        WHERE id = ? AND user_id = ?
      `;

      await connection.execute(query, updateValues);
      await connection.commit();

      return this.getAddressById(addressId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a shipping address
   */
  async deleteAddress(addressId: string, userId: string): Promise<void> {
    // Verify the address belongs to the user
    const existingAddress = await this.getAddressById(addressId);
    if (existingAddress.userId !== userId) {
      throw new Error("Unauthorized: Address does not belong to user");
    }

    const query = `DELETE FROM shipping_addresses WHERE id = ? AND user_id = ?`;
    const [result] = await this.pool.execute(query, [addressId, userId]);
    const deleteResult = result as any;

    if (deleteResult.affectedRows === 0) {
      throw new Error("Shipping address not found or unauthorized");
    }
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(addressId: string, userId: string): Promise<ShippingAddress> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verify the address belongs to the user
      const existingAddress = await this.getAddressById(addressId);
      if (existingAddress.userId !== userId) {
        throw new Error("Unauthorized: Address does not belong to user");
      }

      // Unset all other default addresses
      await connection.execute(
        `UPDATE shipping_addresses 
         SET is_default = false 
         WHERE user_id = ?`,
        [userId]
      );

      // Set this address as default
      await connection.execute(
        `UPDATE shipping_addresses 
         SET is_default = true, updated_at = ? 
         WHERE id = ? AND user_id = ?`,
        [new Date(), addressId, userId]
      );

      await connection.commit();

      return this.getAddressById(addressId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}


import { Store, CreateStoreRequest, UpdateStoreRequest } from '../types/store';
import { StoreModel } from '../models/StoreModel';
import { createError } from '../middleware/errorHandler';

export class StoreService {

  async getAllStores(): Promise<Store[]> {
    return await StoreModel.findAll();
  }

  async getStoresByCategory(category: string): Promise<Store[]> {
    if (category === 'All') {
      return await StoreModel.findAll();
    }
    return await StoreModel.findByCategory(category);
  }

  async searchStores(query: string): Promise<Store[]> {
    return await StoreModel.search(query);
  }

  async getStoreById(id: string): Promise<Store> {
    const store = await StoreModel.findById(id);
    if (!store) {
      throw createError(`Store with ID ${id} not found`, 404);
    }
    return store;
  }

  async createStore(storeData: CreateStoreRequest): Promise<Store> {
    return await StoreModel.create(storeData);
  }

  async updateStore(id: string, updateData: UpdateStoreRequest): Promise<Store> {
    const store = await StoreModel.update(id, updateData);
    if (!store) {
      throw createError(`Store with ID ${id} not found`, 404);
    }
    return store;
  }

  async deleteStore(id: string): Promise<void> {
    const deleted = await StoreModel.delete(id);
    if (!deleted) {
      throw createError(`Store with ID ${id} not found`, 404);
    }
  }

  async getCategories(): Promise<string[]> {
    return await StoreModel.getCategories();
  }

  async getMembershipStores(): Promise<Store[]> {
    const allStores = await StoreModel.findAll();
    return allStores.filter(store => store.membership);
  }

  async getStoresByMembershipType(membershipType: 'basic' | 'premium' | 'platinum'): Promise<Store[]> {
    return await StoreModel.findByMembershipType(membershipType);
  }

  async getPremiumStores(): Promise<Store[]> {
    const allStores = await StoreModel.findAll();
    return allStores.filter(store => 
      store.membership && 
      (store.membership.type === 'premium' || store.membership.type === 'platinum')
    );
  }
}

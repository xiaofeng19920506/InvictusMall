import { Store, CreateStoreRequest, UpdateStoreRequest } from '../types/store';
import { StoreModel } from '../models/StoreModel';
import { createError } from '../middleware/errorHandler';

export class StoreService {

  async getAllStores(): Promise<Store[]> {
    try {
    return await StoreModel.findAll();
    } catch (error) {
      console.error('StoreService.getAllStores error:', error);
      // Return empty array on any error to prevent 500
      return [];
    }
  }

  async getStoresByCategory(category: string): Promise<Store[]> {
    try {
    if (category === 'All') {
      return await StoreModel.findAll();
    }
    return await StoreModel.findByCategory(category);
    } catch (error) {
      console.error('StoreService.getStoresByCategory error:', error);
      return [];
    }
  }

  async searchStores(query: string): Promise<Store[]> {
    try {
    return await StoreModel.search(query);
    } catch (error) {
      console.error('StoreService.searchStores error:', error);
      return [];
    }
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
    try {
    return await StoreModel.getCategories();
    } catch (error) {
      console.error('StoreService.getCategories error:', error);
      // Return empty array on any error to prevent 500
      return [];
    }
  }

}

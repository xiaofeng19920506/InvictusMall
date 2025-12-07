package com.invictusmall.service;

import com.invictusmall.model.Store;
import com.invictusmall.repository.StoreRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StoreService {

    @Autowired
    private StoreRepository storeRepository;

    public List<Store> getAllStores(String category, String search) {
        if (category != null && !category.isEmpty()) {
            return storeRepository.findByCategory(category);
        }
        if (search != null && !search.isEmpty()) {
            return storeRepository.searchStores(search);
        }
        return storeRepository.findAll();
    }

    public Store getStoreById(String id) {
        return storeRepository.findById(id).orElse(null);
    }

    public List<String> getCategories() {
        return storeRepository.findAllCategories();
    }
}



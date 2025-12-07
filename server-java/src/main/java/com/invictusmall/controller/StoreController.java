package com.invictusmall.controller;

import com.invictusmall.model.Store;
import com.invictusmall.service.StoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stores")
public class StoreController {

    @Autowired
    private StoreService storeService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllStores(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search) {
        List<Store> stores = storeService.getAllStores(category, search);
        Map<String, Object> response = Map.of(
            "success", true,
            "data", stores,
            "count", stores.size()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getStoreById(@PathVariable String id) {
        Store store = storeService.getStoreById(id);
        if (store == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> response = Map.of(
            "success", true,
            "data", store
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/categories")
    public ResponseEntity<Map<String, Object>> getCategories() {
        List<String> categories = storeService.getCategories();
        Map<String, Object> response = Map.of(
            "success", true,
            "data", categories
        );
        return ResponseEntity.ok(response);
    }
}



package com.invictusmall.repository;

import com.invictusmall.model.Store;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreRepository extends JpaRepository<Store, String> {
    
    @Query("SELECT DISTINCT s FROM Store s JOIN s.categories c WHERE c.category = :category")
    List<Store> findByCategory(@Param("category") String category);
    
    @Query("SELECT s FROM Store s WHERE s.name LIKE %:search% OR s.description LIKE %:search%")
    List<Store> searchStores(@Param("search") String search);
    
    @Query("SELECT DISTINCT c.category FROM StoreCategory c")
    List<String> findAllCategories();
}


